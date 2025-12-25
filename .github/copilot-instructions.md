# Copilot / AI agent instructions — Formulario-Mamparas

Purpose: quickly orient an AI coding agent to the codebase, conventions, and high‑value touchpoints so changes are safe and productive.

- **Big picture**: This is a small static web app (multi‑page SPA-like behavior) served as plain files under the project root. HTML lives in `html/`, styles in `css/`, and JavaScript in `js/`. There is no bundler in the repo — scripts are loaded directly from HTML.

- **Key areas and responsibilities**:
  - UI / pages: `html/` (forms, registros, reportes) — edit markup and page-level script tags here.
  - Client logic: `js/` (subfolders: `formularios/`, `mamparas/`, `dashboard/`, `sidebar/`, `utils/`) — follow existing module-style plain JS files (no ES build step assumed).
  - Styling: `css/` and `tailwind.config.js` — Tailwind is used; `css/tailwind.css` is the compiled output.
  - Offline: `service-worker.js` implements caching rules and a BASE_PATH detection; be careful changing caching logic (see notes below).
  - DocX generation: `js/formularios/generador-docx.js`, `js/libs/docxtemplater-image-module.js`, and templates under `storage-temp/` — changes here affect downloadable DOCX generation.
  - Backend/integration: `js/utils/supabase.js` contains Supabase integration; service worker explicitly ignores requests containing `supabase.co`.

- **Project-specific patterns & gotchas**:
  - Case sensitivity: many references in `service-worker.js` use capitalized `CSS/` paths while the folder is `css/` on disk. Windows is case-insensitive (works locally), but changes may break on case-sensitive hosts — prefer lower‑case paths matching the `css/` directory.
  - No bundler assumption: files are edited and loaded directly. Avoid introducing build-only language features unless you add a clear build step and update HTML entry points.
  - Service worker behavior: `service-worker.js` uses a custom `detectBasePath()` to compute a `BASE_PATH`. This affects cache keys and asset URL normalization — test deployments under non-root paths.
  - Cache versioning: `VERSION` (currently in the SW) controls cache invalidation. Incrementing it will purge old caches on activate.

- **Where to look when debugging runtime issues**:
  - `service-worker.js` — offline/caching regressions and asset mismatches.
  - `js/utils/storage.js` and `js/utils/supabase.js` — persistence and remote data issues.
  - `js/formularios/*` and `js/mamparas/*` — form handling, validation, and submit flows.
  - `storage-temp/` and `docxtemplater.js` — docx template mismatches or templating errors.

- **Developer workflows and commands (practical choices)**:
  - Serve locally (simple static server):

    npx http-server . -p 8080

  - Tailwind dev build (recommended if editing utilities):

    npx tailwindcss -i css/tailwind-input.css -o css/tailwind.css --watch

  - If you add a build step, update HTML script/style references to point at the build outputs (avoid breaking plain file loading).

- **Safe change checklist for PRs**:
  - Confirm requested JS file is loaded via an HTML page in `html/` before removing or renaming.
  - If changing styles, update the compiled `css/tailwind.css` or include build instructions in the PR description.
  - For SW changes: increment `VERSION`, test both online and offline flows, and verify cache entries (use DevTools Application > Cache Storage).
  - When touching Supabase flows, keep `supabase.co` calls out of SW caching (current code explicitly ignores them).

- **Files to open first for most tasks**:
  - `service-worker.js` — caching, BASE_PATH logic
  - `js/utils/supabase.js` and `js/utils/storage.js` — persistence/integration
  - `js/formularios/generador-docx.js` and `storage-temp/` — docx generation
  - `html/formulario.html` and `html/registros.html` — example pages and script includes

If any section is unclear or you want this reshaped (more examples, add package.json scripts, or add CI/lint guidance), tell me which area and I will iterate.
