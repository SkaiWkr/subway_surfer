# Pink Metro Rush

A lightweight Subway Surfers-inspired endless runner built with plain HTML5 Canvas, CSS, and JavaScript. The main character is a girl wearing baggy clothes and a pink top, sprinting through a neon pink subway theme.

## Play locally

Open `index.html` in any modern browser, or serve the folder with a static server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Controls

- Move lanes: Left/Right arrows, A/D, or swipe left/right
- Jump: Up arrow, W, Space, swipe up, or tap the top half
- Slide: Down arrow, S, swipe down, or tap the bottom half

## Optimization notes

- Uses a single canvas and one `requestAnimationFrame` loop.
- Caps device pixel ratio to keep rendering smooth on high-DPI screens.
- Reuses compact object arrays for obstacles, pickups, and particles.
- Ships without external dependencies, images, or build tooling.
