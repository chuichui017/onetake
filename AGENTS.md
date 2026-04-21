<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project

onetake is a browser-based screen + webcam recording tool with a tldraw whiteboard overlay.
All recording uses native browser APIs (MediaRecorder + Canvas + getUserMedia); no server-side processing.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Stack (all recent versions — check latest docs before writing new code)

- Next.js 16 (App Router, Server Components by default)
- React 19 (new hooks: `use`, Actions, etc.)
- Tailwind CSS 4 (new `@theme` syntax, not old JS config)
- tldraw 4 (API changed vs v2/v3)
- Zustand 5 for state
- lucide-react for icons

## Layout

- `src/app/` — Next.js App Router pages and global CSS
- `src/components/` — React components (flat, no subfolders)
- `src/hooks/` — Custom hooks (camera, screen share, hotkeys, layout)
- `src/lib/` — Core logic (recording, compositing, Zustand store, etc.). Read the files to see what's available.
- `public/` — Static assets

## Conventions

- All client state lives in Zustand stores (`src/lib/store.ts`). Do not introduce Context or Redux.
- Recording pipeline stays pure browser API. Do not add server endpoints for recording.
- Components go in `src/components/` flat, no nested folders.
- Use `lucide-react` for icons. Do not import other icon libraries.

## Don't

- Don't run `npm install` without asking first.
- Don't modify files under `node_modules/next/dist/docs/` (those are Next.js's own docs for agents) — read them, but never write.
- Don't downgrade React/Next/Tailwind/tldraw to match older training data — read their current docs.
