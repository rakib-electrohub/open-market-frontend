# Frontend workflow guide

This folder is the Vite-based React frontend copy.

## Purpose
- Keep the original React/Vite UI here.
- Use this folder for Vite-specific frontend changes only.
- Do not mix Next.js migration files here.

## Main folders
- [src](src) — app pages, components, hooks, API helpers, and UI logic
- [public](public) — static assets
- [components.json](components.json) — shadcn/ui config

## Commands
From this folder:

```powershell
cd frontend
npm install
npm run dev
```

## Backend dependency
The frontend talks to the backend server from the repository root:

```powershell
cd ..
npm run server
```

## Notes
- This is the stable React/Vite frontend copy.
- If the task is about the new Next.js migration, use [nextfrontend](../nextfrontend) instead.
