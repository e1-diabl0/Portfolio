(() => {
  const DATA = window.PORTFOLIO_PAGES || {};
  const pageId = document.body.dataset.page || 'home';
  const page = DATA[pageId];
  const target = document.getElementById('pageContent');
  if (page && target) {
    document.title = `${page.title} — Nolan Noronha`;
    const crumb = document.getElementById('crumbTitle');
    if (crumb) crumb.textContent = page.title.toUpperCase();
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', page.description || page.subtitle);
    if (pageId === 'home') {
      target.innerHTML = `<div class="page-body">${page.html}</div>`;
    } else {
      target.innerHTML = `<header class="page-title-block"><p class="eyebrow">${page.kicker}</p><h1>${page.title}</h1><p class="page-subtitle">${page.subtitle}</p></header><div class="page-body">${page.html}</div>`;
    }
  } else if (target) {
    target.innerHTML = '<p class="loading">This portfolio page is not available yet.</p>';
  }

  // ?edit in the URL reveals hidden placeholder notes while updating content.
  if (new URLSearchParams(location.search).has('edit')) document.body.classList.add('show-todo');

  // Certificate lightbox: open the full-size scan; click, Esc or Close to dismiss.
  document.addEventListener('click', e => {
    const btn = e.target.closest('.cert-open');
    if (!btn) return;
    const box = document.createElement('div');
    box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = `<img src="${btn.dataset.full}" alt="${btn.querySelector('img').alt}"><button type="button">CLOSE ✕</button>`;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); btn.focus(); };
    const onKey = ev => { if (ev.key === 'Escape') close(); };
    box.addEventListener('click', close); document.addEventListener('keydown', onKey);
    document.body.appendChild(box); box.querySelector('button').focus();
  });

  // Responsive sidebar navigation
  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('mobileMenu');
  const scrim = document.getElementById('mobileScrim');
  const closeMenu = () => {
    sidebar?.classList.remove('is-open'); scrim?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false'); menuButton?.setAttribute('aria-label', 'Open page navigation');
  };
  menuButton?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('is-open');
    scrim?.classList.toggle('is-open', Boolean(open));
    menuButton.setAttribute('aria-expanded', String(Boolean(open)));
    menuButton.setAttribute('aria-label', open ? 'Close page navigation' : 'Open page navigation');
  });
  scrim?.addEventListener('click', closeMenu);
  sidebar?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // Small homepage terminal for keyboard-friendly exploration.
  const output = document.getElementById('terminalOutput');
  const form = document.getElementById('terminalForm');
  const input = document.getElementById('terminalInput');
  const asciiDonut = `        .-======-.\n     .-'  .-..-.  '-.\n   .'   .'      '.   '.\n  /    /   .--.   \\    \\n ;    |   (    )   |    ;\n |    |    '--'    |    |\n ;    '.          .'    ;\n  \\     '-.____.-'     /\n   '.                .'\n     '-.__________.-'`;
  const commands = {
    help: 'Available commands:\n  about      who I am\n  work       selected projects\n  interests  life beyond school\n  goals      what I am working towards\n  donut      a little ASCII experiment\n  clear      reset this panel',
    about: 'Nolan Noronha — student, builder, competitor and community leader. Interested in maths, physics, software, hardware and practical problem-solving.',
    work: 'StudyNest (in development) · Automated Outrigger System (Infomatrix Asia silver, 2025) · Eco Drop (ongoing) · proposed air-quality monitor · signage-company work experience.',
    interests: 'Piano and other instruments · running and hiking · basketball and football · taekwondo (red belt) · modern physics · mathematics · economics and world trade.',
    goals: '01 — Develop StudyNest further.\n02 — Deepen maths and physics; prepare for the Uganda Mathematical Society training / selection process.\n03 — Build endurance towards a marathon or HYROX.',
    donut: asciiDonut,
    clear: 'Panel cleared. Type help to see the commands.'
  };
  function runCommand(raw) {
    if (!output) return;
    const command = raw.trim().toLowerCase(); if (!command) return;
    output.textContent = commands[command] || `No command named “${command}”. Type help to see what is available.`;
  }
  form?.addEventListener('submit', event => { event.preventDefault(); runCommand(input.value); input.value = ''; });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => { runCommand(button.dataset.command || 'help'); input?.focus(); }));

  // Dot-matrix portrait with a pointer-controlled magnifying lens. The fallback is original procedural art.
  const canvas = document.getElementById('dotPortrait');
  if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const off = document.createElement('canvas'); off.width = canvas.width; off.height = canvas.height;
    const octx = off.getContext('2d');
    let sourceReady = false, pointer = null, loadedPhoto = null;
    const message = document.getElementById('portraitMessage');
    function fallbackArt() {
      const w=off.width,h=off.height; octx.fillStyle='#13150f'; octx.fillRect(0,0,w,h);
      octx.strokeStyle='rgba(159,181,125,.16)'; octx.lineWidth=1;
      for(let x=0;x<w;x+=26){octx.beginPath();octx.moveTo(x,0);octx.lineTo(x,h);octx.stroke()}
      for(let y=0;y<h;y+=26){octx.beginPath();octx.moveTo(0,y);octx.lineTo(w,y);octx.stroke()}
      octx.save();octx.translate(w/2,h/2);
      [165,126,86].forEach((r,i)=>{octx.beginPath();octx.ellipse(0,0,r,r*(i===1?.56:1),i*.45,0,Math.PI*2);octx.strokeStyle=['#62734e','#90a56d','#d6ff78'][i];octx.globalAlpha=[.5,.55,.7][i];octx.lineWidth=1.4;octx.stroke()});
      octx.globalAlpha=1;octx.fillStyle='#d6ff78';octx.font='700 95px "Space Grotesk",sans-serif';octx.textAlign='center';octx.textBaseline='middle';octx.fillText('N.',0,0);
      octx.fillStyle='#e9eddd';[[138,-95,5],[-154,85,4],[30,-180,4],[-50,161,3]].forEach(([x,y,r])=>{octx.beginPath();octx.arc(x,y,r,0,Math.PI*2);octx.fill()});octx.restore();sourceReady=true;draw();
    }
    function fitPhoto(img) {
      const w=off.width,h=off.height,ir=img.width/img.height,cr=w/h;let sx=0,sy=0,sw=img.width,sh=img.height;
      if(ir>cr){sw=img.height*cr;sx=(img.width-sw)/2}else{sh=img.width/cr;sy=(img.height-sh)/2}
      octx.fillStyle='#13150f';octx.fillRect(0,0,w,h);octx.drawImage(img,sx,sy,sw,sh,0,0,w,h);sourceReady=true;draw();
    }
    function loadPhoto(src, isUser=false) { const img=new Image();img.onload=()=>{loadedPhoto=img;fitPhoto(img);if(message)message.textContent=isUser?'Local preview loaded. To make it permanent, save a copy as assets/nolan-portrait.jpg and publish again.':'Portrait loaded from assets/nolan-portrait.jpg.'};img.onerror=()=>{if(!sourceReady)fallbackArt();};img.src=src; }
    function draw() {
      if(!ctx||!sourceReady)return;
      const w=canvas.width,h=canvas.height;ctx.fillStyle='#13150f';ctx.fillRect(0,0,w,h);
      const spacing=7;const lensR=Math.min(w,h)*.185;const p=pointer;
      const pixels=octx.getImageData(0,0,w,h).data;
      for(let y=4;y<h;y+=spacing){for(let x=4;x<w;x+=spacing){
        let sx=x,sy=y,inLens=false,dist=9999;
        if(p){const dx=x-p.x,dy=y-p.y;dist=Math.sqrt(dx*dx+dy*dy);if(dist<lensR){inLens=true;sx=p.x+dx/1.9;sy=p.y+dy/1.9;}}
        sx=Math.max(0,Math.min(w-1,Math.round(sx)));sy=Math.max(0,Math.min(h-1,Math.round(sy)));
        const i=(sy*w+sx)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],lum=(r*.25+g*.62+b*.13)/255;
        const radius=(.65+lum*2.15)*(inLens?1.32:1);
        let cr=r,cg=g,cb=b;
        if(lum>.6 && ((x*73856093)^(y*19349663))%23===0){cr=214;cg=255;cb=120;}
        const alpha=.38+lum*.62;ctx.fillStyle=`rgba(${cr},${cg},${cb},${alpha})`;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      }}
      if(p){ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,lensR,0,Math.PI*2);ctx.strokeStyle='rgba(214,255,120,.85)';ctx.lineWidth=1.2;ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,lensR+6,0,Math.PI*2);ctx.strokeStyle='rgba(214,255,120,.2)';ctx.stroke();ctx.restore();}
      else {ctx.strokeStyle='rgba(214,255,120,.65)';ctx.strokeRect(10,10,w-20,h-20);}
    }
    function setPointer(e){const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*canvas.width,y:(e.clientY-r.top)/r.height*canvas.height};draw();}
    canvas.addEventListener('pointermove',setPointer);canvas.addEventListener('pointerleave',()=>{pointer=null;draw()});canvas.addEventListener('pointerdown',setPointer);
    const upload=document.getElementById('portraitUpload');upload?.addEventListener('change',()=>{const file=upload.files?.[0];if(file&&file.type.startsWith('image/')){const reader=new FileReader();reader.onload=()=>loadPhoto(reader.result,true);reader.readAsDataURL(file);}});
    loadPhoto('assets/nolan-portrait-dots.jpg');
  }
})();
