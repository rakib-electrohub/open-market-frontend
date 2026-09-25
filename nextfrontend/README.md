# Open Market Next.js

This is the isolated Next.js App Router migration for Open Market. The original Vite app remains in the sibling `frontend` folder and is not modified by this project.

## Run

```bash
npm install
npm run dev
```

The combined Next.js and marketplace server runs on `http://localhost:3000`. It initializes PostgreSQL, serves the existing `/api` contract, and hands storefront routes to Next.js. Use `npm run dev:next` only when you want the Next UI without the API process.

Optional environment variables:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_URL=http://localhost:4000
```

## Migration structure

- `src/app/(store)` contains public storefront routes and the shared store layout.
- `src/app/(auth)` contains login and registration routes.
- `src/app/product/[id]` and `src/app/store/[sellerId]` are dynamic, server-rendered SEO routes.
- `src/app/admin`, `src/app/seller`, and `src/app/staff` contain dashboard routes.
- `src/lib/api.js` forwards the incoming session cookie to the existing API.
- `src/lib/auth.js` provides server-side session and role guards.
- `src/app/sitemap.js` and `src/app/robots.js` generate SEO files automatically.
- `server/` contains the colocated database, authentication, uploads, email, and API server used by `npm run dev`.

The original UI is copied into `src/legacy-pages` and rendered through the Next App Router with the existing shared components and API contract. Browser-only features remain inside the client compatibility boundary and can be converted to smaller client components incrementally.
