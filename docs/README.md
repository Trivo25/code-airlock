# Code Airlock website

Static landing page for [code-airlock](https://github.com/Trivo25/code-airlock). Plain HTML, CSS, and vanilla JavaScript. No build step, no dependencies.

## Files

- `index.html` page content
- `styles.css` all styling
- `main.js` copy buttons, terminal tabs, hero diagram animation, star counts, teams form
- `favicon.svg`, `apple-touch-icon.png`, `og.png` icons and social preview
- `fonts/` self-hosted Geist and Geist Mono (variable, latin subset)
- `demo.mp4`, `demo-poster.jpg` demo recording (trimmed and encoded from the repo's `animation.gif`)
- `robots.txt`, `sitemap.xml`, `404.html` crawler and error plumbing

The Teams pilot form posts to Formspree (`https://formspree.io/f/mvzepkbo`); change the `action` in `index.html` to rotate the endpoint.

## Local development

Open `index.html` directly, or serve the directory so clipboard and fetch behave like production:

```bash
cd docs
python3 -m http.server 8080
# http://localhost:8080
```

There is nothing to install or compile. Edit the files and reload.

## Deployment

**GitHub Pages** (simplest): repository Settings, then Pages, then set the source to the `main` branch and the `/docs` folder. The site appears at `https://trivo25.github.io/code-airlock/`.

**Netlify / Vercel / Cloudflare Pages**: point the project at this repository with no build command and `docs` as the output/publish directory.

After deploying somewhere other than GitHub Pages, update the `canonical`, `og:url`, and `og:image` URLs in `index.html`.
