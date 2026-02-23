# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Vite dev server (proxies /api → http://localhost:3000)
pnpm build        # Type-check (tsc -b) then Vite build
pnpm lint         # ESLint on all .ts/.tsx files
pnpm preview      # Preview production build
```

No test framework is configured.

## Architecture: Feature-Sliced Design (FSD)

This project follows the FSD architecture. Layers are ordered top-to-bottom; **imports may only go downward** (e.g., features can import from entities and shared, but never from pages or widgets).

```
src/
├── app/          # Providers, router, layouts, entry (app.tsx)
├── pages/        # Route-level components (one per URL)
├── widgets/      # Composite UI blocks (PostList, Header)
├── features/     # User actions with mutations (create/update/delete post)
├── entities/     # Domain models with queries (Post types, usePost, PostCard)
├── shared/       # Infra: API client, config, types, shadcn/ui components
└── main.tsx
```

**Key rules:**
- Each slice (e.g., `entities/post/`) exposes a public API via `index.ts` — never import internal files directly
- Slices use `model/`, `api/`, `ui/` segments internally
- Same-layer cross-slice imports are forbidden (e.g., `entities/post` cannot import `entities/user`)
- `entities` = read-only domain (queries only); `features` = user actions (mutations only)

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **TanStack Router** — route-based code splitting, type-safe `$param` syntax
- **TanStack Query** — server state with query key factory pattern (`postQueryKeys`)
- **react-hook-form** + **yup** — form validation (schemas in `features/*/model/`)
- **shadcn/ui** (New York style) — installed to `src/shared/ui/`, configured via `components.json`
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin

## Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

## API Setup

- `shared/api/api-client.ts` — generic fetch wrapper used by all API calls
- Environment variable: `VITE_API_BASE_URL` (defaults to `/api`)
- Vite dev server proxies `/api` to `http://localhost:3000` with path rewrite (strips `/api` prefix)

## shadcn/ui

Components install to `@/shared/ui` (not default `@/components/ui`). After adding a new shadcn component, re-export it from `src/shared/ui/index.ts`.

```bash
npx shadcn@latest add <component-name>
```
