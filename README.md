# Bromaslog

Static site (HTML, CSS, JavaScript), published with GitHub Pages: https://42paolo.github.io/bromaslog/

## Structure

```
index.html            the page
css/                  styles (site.css, motion.css = animation tokens, preloader.css, contact.css, hangar.css)
js/                   scripts; js/vendor/ holds GSAP and Lenis
assets/
  fonts/              IBM Plex Mono
  images/             logo, posters; images/machines/ = the three machines
  video/              videos used by the page
source/               originals and working files (not published, see .gitignore)
```

## Working on it

```
python3 -m http.server 4323
```

then open http://localhost:4323/. Every change goes live with a push to `main`; when a CSS or JS file changes, raise its `?v=` number in `index.html` so browsers fetch the new one.

Animation timings and curves come from the tokens in `css/motion.css` (read by `js/motion.js`): do not hard-code them.
