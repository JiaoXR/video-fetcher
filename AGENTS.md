# Repository Guidelines

## Project Structure & Module Organization
- Extension lives in `extension/`:
  - `extension/manifest.json` — MV3 manifest and permissions.
  - `extension/background.js` — webRequest detection, cache, messaging, context menu, badge.
  - `extension/content_script.js` — DOM scanning for `<video>` and `<source>`.
  - `extension/popup.html|css|js` — popup UI to list, download, copy links.
- Product spec: `浏览器视频下载插件需求文档.md` — read before changes.

## Build, Test, and Development Commands
- No build step required (plain JavaScript MV3).
- Load locally: `chrome://extensions` → enable Developer mode → “Load unpacked” → select `extension/`.
- Optional testing (if you add tooling): `npm test`.

## Coding Style & Naming Conventions
- Language: JavaScript (ES2022). Indent 2 spaces; single quotes.
- Naming: files `kebab-case.js`; variables/functions `camelCase`; classes `PascalCase`.
- Boundaries: no DOM in `background.js`; no webRequest in `content_script.js`.
- Security: no telemetry; do not transmit URLs or content off-device.

## Testing Guidelines
- Focus: URL/type detection, request matching, message routing, download invocation.
- Manual: with the extension loaded, open a page with `<video>` or streaming; check badge count and popup list; test Download and Copy actions.

## Commit & Pull Request Guidelines
- Commits follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`.
- PRs include: purpose, linked issues, before/after screenshots (popup), test plan, and any `manifest.json` permission changes with justification.
- Keep changes small and atomic; update spec or README when behavior changes.

## Security & Configuration Tips
- Minimize permissions; justify changes to `webRequest`, `downloads`, `clipboardWrite`.
- Prefer Manifest V3 APIs; avoid remote code or data collection.
- Validate and sanitize all URLs shown in the UI.
