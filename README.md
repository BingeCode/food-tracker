# Food Tracker

Frontend-only PWA for tracking meals, recipes, ingredients, and daily nutrition goals.

## Development

```bash
pnpm install
pnpm dev
```

The dev server runs with HTTPS via a local self-signed certificate (through `vite-plugin-mkcert`) so camera access and PWA behavior work reliably.

## Can I test PWA locally?

Yes.

1. Start dev server with `pnpm dev`.
2. Open `https://localhost:5173` (or the shown HTTPS URL).
3. In Chrome/Edge: open the install menu (`Install app` in address bar).
4. In Safari: Share → `Add to Dock` / `Add to Home Screen`.

Notes:

- Camera permissions require secure context (HTTPS or localhost).
- For final service-worker behavior, also test preview build:

```bash
pnpm build
pnpm preview
```

## GitHub Pages deployment

This repo already includes a workflow at `.github/workflows/deploy.yml` that deploys on push to `main`.

### One-time setup

1. Push repository to GitHub.
2. In repository settings, open `Pages`.
3. Set source to `GitHub Actions`.
4. Ensure default branch is `main`.

### Deploy

1. Commit and push to `main`.
2. Wait for `Deploy to GitHub Pages` workflow to finish.
3. Open the published URL from the workflow output.

### Install as PWA from GitHub Pages

1. Open the published `https://<user>.github.io/food-tracker/` URL.
2. Use browser install action (`Install app` / `Add to Home Screen`).

Because GitHub Pages is HTTPS, camera + PWA install work there as expected.
