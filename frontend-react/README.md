# File Browser frontend (React)

React + [shadcn/ui](https://ui.shadcn.com) frontend, replacing the Vue app in
`../frontend` step by step.

## Status

- Migrated: the login page, including sign-up mode (reCAPTCHA was dropped,
  the backend no longer enables it).
- Not migrated yet: every other page is a placeholder showing the logged-in
  user and a logout button. Routing, redirects and navigation guards are the
  ones of the Vue app, so users land on the exact same URLs.

## Layout

- `src/router/`: port of `frontend/src/router`. `location.ts` holds the URL
  helpers of vue-router, `routes.ts` the route table, `navigation.ts` the
  redirects and the `beforeResolve` guard. `components/RouterBridge.tsx`
  connects them to React Router's history.
- `src/auth/`: port of `frontend/src/utils/auth.ts` and of the auth store.
- `src/i18n/`: i18next, loading the translations of `../frontend/src/i18n`
  (shared with the Vue app) and detecting the locale like the Vue app.
- `src/views/`: pages.

## Scripts

```sh
pnpm dev     # dev server, proxies /api to http://127.0.0.1:8080
pnpm build   # type check and build to dist/
pnpm test    # unit tests
pnpm lint
```

`src/router/__fixtures__/vue-router.json` records where the Vue router sends
users for many URLs; the navigation tests check the React app against it.
Regenerate it with `node scripts/generate-router-fixtures.mjs` (needs the
dependencies of `../frontend`).

## Serving it with the Go server

`dist/` has the same layout as the Vue build: `dist/public/index.html` is
rendered by the Go server as a template and the other files are served under
`<BaseURL>/static/` (JavaScript files from their `.gz` copy).

```sh
pnpm build
rm -rf ../frontend/dist/* && cp -r dist/* ../frontend/dist/
cd .. && go build
```
