# Open Market Next.js

This is the production Open Market Next.js project. The sibling `frontend` folder is the frozen legacy Vite source and is not used by the Next.js runtime.

## Run

```bash
npm install
npm run dev
```

The combined Next.js and marketplace server runs on `http://localhost:3000`. It initializes PostgreSQL, serves the `/api` contract, and hands storefront routes to Next.js. The application should be run from `nextfrontend`; the old Vite project is no longer part of the deployment.

Required production environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
DATABASE_URL=postgresql://user:password@host:5432/openmarket
REVALIDATE_SECRET=generate-a-long-random-secret
```

`NEXT_PUBLIC_SITE_URL` must be the canonical public origin; leaving it unset makes metadata, robots.txt, and sitemap URLs point to localhost. `DATABASE_URL` must reach the production PostgreSQL database. `REVALIDATE_SECRET` protects the cache revalidation endpoint; in production, revalidation is disabled when this secret is missing. Set `INTERNAL_API_URL` only if server-side catalog and cache requests need an origin different from `NEXT_PUBLIC_SITE_URL`. `API_URL` is used by server-side auth lookups and should point to the deployed API origin when those lookups are used.

`PG_POOL_MAX` is an optional maximum PostgreSQL connections setting for each running app process (default `20`, allowed `1`-`50`). Set it according to the database connection limit and the number of app instances; the combined pool sizes must stay below the database limit, leaving room for maintenance and other clients.

## Live alerts

Admins and approved sellers can enable browser alerts from their dashboard header. Browser permission is required once per device; after that, Web Push can show alerts for new orders and incoming customer messages while the dashboard or browser tab is closed. Push requires HTTPS in production and these server environment variables:

```env
WEB_PUSH_PUBLIC_KEY=your-vapid-public-key
WEB_PUSH_PRIVATE_KEY=your-vapid-private-key
WEB_PUSH_SUBJECT=mailto:support@your-domain.example
```

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Keep the private key secret and configure both keys on every API server instance. Cash-on-delivery orders alert after the order is saved; online-payment orders alert only after payment confirmation. Admins receive the order summary and each approved seller receives only a summary of the products sold by their store. New product-chat messages notify admins and the relevant seller; contact-form messages notify admins.

Alerts use the browser/operating-system notification sound and vibration settings; users must keep notifications enabled on their device.

## Architecture

- `src/app/(store)` contains public storefront routes and shared layouts.
- `src/app/page.js` server-renders the homepage product sections with the configured product limit.
- `src/app/(store)/products/page.js` server-renders 30-product pagination pages. Infinite scroll is a client enhancement and does not change the URL.
- `src/app/(store)/product/[id]/page.js` server-renders product detail, metadata, JSON-LD, and initial reviews.
- `src/app/admin` is client-only, `noindex`, and protected by server-side API authorization.
- `src/server/catalog.js` owns cached public catalog reads with a 60-minute fallback.
- `src/app/api/revalidate/route.js` applies cache tags and paths after mutations.
- `server/` owns PostgreSQL, sessions, authentication, uploads, email, inventory/order APIs, and cache invalidation notifications.

## Rendering Strategy

- **Server-rendered and SEO-visible:** home, products, product details, seller stores, policies, FAQ, contact, and flash sales.
- **Client interactions:** cart, wishlist, checkout controls, search/filter controls, chat, forms, and reviews.
- **Client-only dashboards:** admin, seller, and staff interfaces. Their APIs remain server-authorized and dashboard routes are excluded from indexing.
- **Caching:** public catalog/settings/review data uses tagged caches with a 60-minute fallback. Product, review, category, banner, and settings mutations invalidate affected tags and paths through `/api/revalidate`.

## Orders and Inventory

Order placement must reserve stock transactionally. The order API locks product rows, verifies available quantities, decrements inventory, and records the stock change on the order. A transition into `cancelled` or `refunded` restores the reserved quantity exactly once. Repeated status updates cannot double-decrement or double-restore stock.

The original visual UI is preserved in the copied compatibility components under `src/legacy-pages` and `src/components`; the runtime and deployment target is only `nextfrontend`.
