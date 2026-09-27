# SOL · System of Life

Personal Solo Leveling-style life system. `SPEC.md` is the product source of truth.

## Current shape (v0)
- PWA (React + Vite + vite-plugin-pwa), single user, all data in the device's localStorage. No backend, no AI yet.
- Only Modo Arquiteto: user writes missions in free text, `src/engine/classify.ts` classifies by rules and the engine prices them.
- Deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.

## Rules
- Every balancing value lives in `src/config.ts`; narrative text (classes, achievements) in `src/content.ts`.
- All state transitions live in `src/engine/engine.ts` as pure functions (future Edge Functions). UI never writes XP, level, attributes or class directly.
- Total XP and overall level never go down. Only attributes decay (SPEC §11).
- Run `npm test` after touching the engine; `npm run build` type-checks and builds.
