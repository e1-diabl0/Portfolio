# Nolan Noronha — Portfolio v7

A multi-page static portfolio in a dark editorial style, with the required school navigation structure and an interactive dot-matrix magnifier.

## Preview locally

1. Extract the zip.
2. Open `index.html` in a browser.
3. Keep all HTML pages, `styles.css`, `content.js`, `script.js`, and the `assets` folder together.

Some browsers restrict local image loading when opening a file directly. The dot art still has an abstract fallback. To use a real portrait on the published site, add a photograph named `nolan-portrait.jpg` inside `assets/`. The homepage's “Preview a portrait” button only previews the selected file in the current browser session; it does not automatically save or upload the image.

## Publishing

Upload the extracted folder contents to a static host such as Netlify or GitHub Pages. Keep page files in the same root folder so sidebar links work.

## Pages included

- Home
- My Schedules
- My Academics: Mathematics, Chemistry, Physics, IT
- My Achievements: Outline, Awards
- Projects: Individual, Group Project
- Global Citizenship: Volunteering, International trips, DofE / Club, Charity, Sports, Leadership, Olympiads, Work Experience, Gallery
- Environmental Stewardship

## Update content

Page copy is in `content.js` as page-specific HTML. Shared layout and interaction logic is in `script.js`; colours, typography, spacing and responsive rules are in `styles.css`. Personal facts which need supporting evidence or further clarification are phrased as reported, in progress, proposed, or waiting for details. No result statistics are invented.

Before publication, add real photographs/certificates, review privacy of any photos with other people, clarify competition categories and dates, and choose a public contact method.

## v5 changes (October 2026)

- Homepage cover (v7): `cover.js` draws the portrait as a full-screen dot field that assembles on load, gets finer and zooms in as you scroll ("scroll, look closer"), with a pointer lens. Dots are drawn once and the zoom is a GPU (CSS transform) animation with eased scrolling, so it stays at 60fps. The photo is embedded in `assets/portrait-data.js` so it also works when index.html is opened straight from the folder.
- Portrait: `assets/nolan-portrait.jpg` (original, rotated) and `assets/nolan-portrait-dots.jpg` (background removed, used for the dot art).
- Placeholder notes are marked `data-todo` and hidden. Open any page with `?edit` (for example `index.html?edit`) to see what is still to add.
- Evidence items now show My role / What I learned / Looking back (`.reflect-grid`).
