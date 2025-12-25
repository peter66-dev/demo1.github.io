# Phương Nguyễn Fabrics — demo1.github.io

A simple static GitHub Pages site for "Phương Nguyễn Fabrics" (company presentation and product portfolio).

Live demo:
https://peter66-dev.github.io/demo1.github.io/

## Project structure

- `CNAME` — custom domain (optional)
- `index.html` — main HTML page
- `css/style.css` — site styles
- `js/main.js` — interactive behavior (nav, portfolio filter, lightbox)
- `images/` — image assets (portfolio, logos)

## Features

- Responsive navbar that becomes sticky on scroll.
- Portfolio grid with filter buttons and lightbox viewer.
- About/services sections and SEO/social meta tags.
- Google Fonts and Font Awesome included.

## Run locally

Follow one of these simple options from the project root.

1. Quick — Python (no install)

```bash
python3 -m http.server 8000
# Open: http://localhost:8000
```

2. Node.js — using `http-server` (install once)

```bash
npm install -g http-server
http-server -p 8000
# Open: http://localhost:8000
```

3. VS Code — Live Server extension (recommended while editing)

- Install the **Live Server** extension in VS Code (Extensions view).
- Open the project folder in VS Code, open `index.html`, then click "Go Live" in the status bar.

Stopping a server

- In the terminal where the server runs press `Ctrl+C`.
- If you closed the terminal, find and kill the process by port (example for port 8000):

```bash
lsof -i :8000           # show process using port 8000
kill $(lsof -t -i :8000)          # gently stop
kill -9 $(lsof -t -i :8000)       # force stop if needed
```

Notes

- If you use the VS Code workspace settings, `editor.formatOnSave` may format files on save — you can disable it in VS Code settings if undesired.
- If the page appears broken after starting a server, open the browser DevTools console to see errors (missing files, CORS, path issues).

## Deploy

Push the repository to GitHub and enable GitHub Pages for the `main` (or `gh-pages`) branch, or use the repository pages deployment.

## Notes for maintainers

- Edit meta tags and social image in `index.html` for SEO.
- Update images in `images/portfolio` for portfolio items.
- `js/main.js` assumes `.portfolio-item` elements present; add/remove items accordingly.

## Custom domain deployment (phuongnguyenfabrics.com)

This site is intended to be served from the custom domain `phuongnguyenfabrics.com`.

Steps to configure deployment:

1. Ensure the repository contains a `CNAME` file with the single line:

   phuongnguyenfabrics.com

   (A `CNAME` file is already present in the repository root.)

2. Commit and push your changes to the branch used for GitHub Pages (commonly `main`):

```bash
git add CNAME README.md
git commit -m "Add custom domain deployment instructions"
git push origin main
```

3. Configure DNS at your domain registrar:

- For the apex domain (`phuongnguyenfabrics.com`), add A records pointing to GitHub Pages IPs:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

- For the `www` subdomain, add a CNAME record pointing to the GitHub Pages host (your GitHub Pages username or `username.github.io`) or to the apex domain. Example:

```
Host: www  -> CNAME -> your-github-username.github.io
```

4. In the GitHub repository, go to Settings → Pages and set the custom domain to `phuongnguyenfabrics.com`. Check `Enforce HTTPS` once the certificate is issued.

5. Wait for DNS propagation (can take minutes to hours). Verify DNS and TLS with:

```bash
dig +short A phuongnguyenfabrics.com
dig +short CNAME www.phuongnguyenfabrics.com
curl -I https://phuongnguyenfabrics.com
```

Notes & troubleshooting:

- It can take up to an hour (sometimes longer) for GitHub to issue a TLS certificate for a new custom domain.
- If you use Cloudflare, start with the Cloudflare proxy disabled (DNS-only) until GitHub issues the certificate; set SSL/TLS mode to "Full" (not "Flexible").
- Make sure the `CNAME` file contains only the domain and no extra whitespace.

You can visit on this link to see our website:
https://peter66-dev.github.io/demo1.github.io/
