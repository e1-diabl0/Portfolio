// Homepage cover: the portrait as a full-bleed dot field.
// The portrait's dots are drawn once into their own canvas; the "scroll, look
// closer" zoom is a CSS transform on that canvas, so it runs on the GPU
// compositor and stays smooth on retina screens and phones. Scroll and pointer
// are eased towards their targets for a weighted feel. A full-screen canvas is
// used only for the opening fly-in, and a small canvas follows the pointer as a lens.
(() => {
  const cover = document.getElementById('cover');
  const stage = cover && cover.querySelector('.cover-sticky');
  const portrait = document.getElementById('coverDots');
  const intro = document.getElementById('coverIntro');
  const lensEl = document.getElementById('coverLens');
  if (!cover || !stage || !portrait || !intro || !lensEl) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = [14, 15, 12], LIME = [214, 255, 120];
  const FOCUS = { u: .5, v: .3 }; // face position inside the photo
  const ZOOM = 1.1, INTRO = 1.8, LENS_MAG = 1.9, MAX_PX = 2400;

  let W = 0, H = 0, img = null, dots = [], buckets = [], base = null, scale = 1, lensR = 0;
  let introStart = 0, introDone = reduce, running = false;
  let p = 0, pointer = null, lens = null, lensA = 0, lastZoom = -1;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 4);
  const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

  function scrollTarget() {
    const r = cover.getBoundingClientRect();
    const track = cover.offsetHeight - window.innerHeight;
    return track > 0 ? clamp(-r.top / track, 0, 1) : 0;
  }
  const zoomAt = pr => 1 + easeInOut(pr) * (base.wide ? ZOOM : .8);

  // Photo frame at zoom 1: right side on wide screens, centred on narrow ones.
  function layout() {
    const wide = W > 900;
    const h = wide ? H * .9 : Math.min(H * .6, W * 1.05);
    const w = h * (img.width / img.height);
    return { x: wide ? W - w - W * .04 : (W - w) / 2, y: wide ? H - h : H * .12, w, h, wide };
  }

  // Sample the photo once into a fixed grid of dots (positions in 0..1 photo space),
  // grouped by quantised colour so each group is a single fill.
  function buildDots(wide) {
    const cols = wide ? 118 : 84;
    const rows = Math.round(cols * img.height / img.width);
    const off = document.createElement('canvas'); off.width = cols; off.height = rows;
    const o = off.getContext('2d'); o.drawImage(img, 0, 0, cols, rows);
    let px;
    try { px = o.getImageData(0, 0, cols, rows).data; } catch (e) { cover.classList.add('no-dots'); return false; }
    dots = []; buckets = []; const map = new Map();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const lum = (px[i] * .25 + px[i + 1] * .62 + px[i + 2] * .13) / 255;
      if (lum < .12) continue;
      const src = lum > .76 && hash(x * 3, y * 5) < .03 ? LIME : [px[i], px[i + 1], px[i + 2]];
      const a = .35 + lum * .65;
      const c = src.map((v, k) => Math.min(255, Math.round((v * a + BG[k] * (1 - a)) / 12) * 12));
      const key = c.join(',');
      if (!map.has(key)) { map.set(key, buckets.length); buckets.push({ fill: `rgb(${key})`, dots: [] }); }
      const d = {
        u: (x + .5) / cols, v: (y + .5) / rows, r: (.2 + lum * .36) / cols,
        sx: (hash(y, x) - .5) * 1.6, sy: (hash(x + 7, y + 3) - .5) * 1.6,
        delay: hash(x, y) * .45 + (y / rows) * .3
      };
      buckets[map.get(key)].dots.push(d); dots.push(d);
    }
    return true;
  }

  // Draw the portrait once, sharp enough for the fully zoomed state.
  function drawPortrait() {
    const dpr = window.devicePixelRatio || 1;
    scale = Math.min(dpr * (1 + ZOOM), MAX_PX / Math.max(base.w, base.h));
    portrait.width = Math.round(base.w * scale); portrait.height = Math.round(base.h * scale);
    Object.assign(portrait.style, {
      left: base.x + 'px', top: base.y + 'px', width: base.w + 'px', height: base.h + 'px',
      transformOrigin: `${FOCUS.u * 100}% ${FOCUS.v * 100}%`
    });
    const c = portrait.getContext('2d'), sw = portrait.width, sh = portrait.height;
    for (const b of buckets) {
      c.fillStyle = b.fill; c.beginPath();
      for (const d of b.dots) { const x = d.u * sw, y = d.v * sh, r = d.r * sw; c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }
      c.fill();
    }
    lastZoom = -1;
  }

  function sizeLens() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lensR = Math.round(Math.min(W, H) * .16);
    lensEl.width = lensEl.height = Math.round(lensR * 2 * dpr);
    lensEl.style.width = lensEl.style.height = lensR * 2 + 'px';
  }

  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!img) return;
    const wasWide = base && base.wide;
    base = layout();
    if (!dots.length || wasWide !== base.wide) { if (!buildDots(base.wide)) return false; }
    drawPortrait(); sizeLens(); kick();
    return true;
  }

  // Opening fly-in on a full-screen canvas; dots land exactly on the portrait.
  function drawIntro(t) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (intro.width !== Math.round(W * dpr)) { intro.width = Math.round(W * dpr); intro.height = Math.round(H * dpr); }
    const c = intro.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const z = zoomAt(p), fx = base.x + FOCUS.u * base.w, fy = base.y + FOCUS.v * base.h;
    const f = { x: fx - FOCUS.u * base.w * z, y: fy - FOCUS.v * base.h * z, w: base.w * z, h: base.h * z };
    for (const b of buckets) {
      c.fillStyle = b.fill; c.beginPath();
      for (const d of b.dots) {
        const k = easeOut((t - d.delay) / (INTRO - .75));
        if (k <= 0) continue;
        const x = f.x + d.u * f.w + d.sx * W * (1 - k), y = f.y + d.v * f.h + d.sy * H * (1 - k);
        const r = d.r * f.w * (.4 + .6 * k);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2);
      }
      c.fill();
    }
  }

  function endIntro() {
    introDone = true;
    portrait.style.opacity = '1';
    intro.style.opacity = '0';
    setTimeout(() => { intro.width = intro.height = 0; }, 400);
  }

  // Lens: a small canvas that follows the pointer and shows the portrait magnified.
  function drawLens(z) {
    const c = lensEl.getContext('2d'), s = lensEl.width / (lensR * 2);
    c.setTransform(s, 0, 0, s, 0, 0);
    c.clearRect(0, 0, lensR * 2, lensR * 2);
    c.save(); c.beginPath(); c.arc(lensR, lensR, lensR, 0, Math.PI * 2); c.fillStyle = 'rgb(14,15,12)'; c.fill(); c.clip();
    // Portrait's on-screen rect at the current zoom, magnified around the lens centre.
    const fx = base.x + FOCUS.u * base.w, fy = base.y + FOCUS.v * base.h;
    const rx = fx - FOCUS.u * base.w * z, ry = fy - FOCUS.v * base.h * z, rw = base.w * z, rh = base.h * z;
    const m = LENS_MAG;
    c.drawImage(portrait, lensR - (lens.x - rx) * m, lensR - (lens.y - ry) * m, rw * m, rh * m);
    c.restore();
    c.strokeStyle = 'rgba(214,255,120,.85)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(lensR, lensR, lensR - 1, 0, Math.PI * 2); c.stroke();
  }

  function frame(now) {
    const t = reduce ? 99 : (now - introStart) / 1000;
    const target = reduce ? 0 : scrollTarget();
    p += (target - p) * .09; if (Math.abs(target - p) < .0004) p = target;
    const z = zoomAt(p);
    if (Math.abs(z - lastZoom) > 1e-5) { portrait.style.transform = `scale(${z})`; lastZoom = z; }

    if (!introDone) { if (t < INTRO) drawIntro(t); else endIntro(); }

    let lensMoving = false;
    if (introDone && (pointer || lensA > .01)) {
      if (pointer) {
        lens = lens ? { x: lens.x + (pointer.x - lens.x) * .22, y: lens.y + (pointer.y - lens.y) * .22 } : { ...pointer };
        lensA += (1 - lensA) * .18;
        lensMoving = Math.abs(pointer.x - lens.x) + Math.abs(pointer.y - lens.y) > .3 || lensA < .99;
      } else { lensA *= .8; lensMoving = lensA > .01; }
      lensEl.style.opacity = lensA.toFixed(3);
      lensEl.style.transform = `translate3d(${lens.x - lensR}px, ${lens.y - lensR}px, 0) scale(${.85 + .15 * lensA})`;
      drawLens(z);
    }

    if (!introDone || p !== target || lensMoving) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() { if (!running && base) { running = true; requestAnimationFrame(frame); } }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', kick, { passive: true });
  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect(), q = portrait.getBoundingClientRect();
    const over = e.clientX >= q.left && e.clientX <= q.right && e.clientY >= q.top && e.clientY <= q.bottom;
    pointer = over ? { x: e.clientX - r.left, y: e.clientY - r.top } : null; kick();
  });
  stage.addEventListener('pointerleave', () => { pointer = null; kick(); });

  const im = new Image();
  im.onload = () => {
    img = im;
    p = reduce ? 0 : scrollTarget();
    if (!resize()) return;
    if (reduce) portrait.style.opacity = '1';
    introStart = performance.now();
    cover.classList.add('is-ready'); kick();
  };
  im.onerror = () => cover.classList.add('no-dots');
  im.src = window.NN_PORTRAIT || 'assets/nolan-portrait-dots.jpg';
})();
