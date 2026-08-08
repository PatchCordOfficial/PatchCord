# PatchCord Changelog

## PatchCord V17 (1.7.0.0) — Codebase Optimization & Stability

### Highlights
- Migrated all raw `console.log`/`console.error` calls to the structured `Logger` utility across 10+ plugins for consistent, branded logging.
- Added `ErrorBoundary` crash isolation to 8 plugins that inject components via patches, preventing individual plugin failures from cascading.
- Eliminated silent error swallowing in `bannersEverywhere` and `betterAudioPlayer` — caught errors are now properly logged.
- Deduplicated a shared FFmpeg class-worker blob (~5.7 KB) that was copy-pasted across 3 plugins into a single utility module.

### Fixes
- Removed a debug `console.log(data)` in the settings import path that could log the entire user settings payload.
- Removed stray debug `console.log("clicked")` in export messages button.
- Fixed `guildPickerDumper` returning `console.log` instead of `return` on missing servers.
- `clipUpload.desktop` FFmpeg worker blob now properly calls `URL.revokeObjectURL` in a finally block, fixing a memory leak retained from the other copies.

### Internal
- Created `src/utils/ffmpegWorker.ts` as the single source of truth for the FFmpeg class-worker definition.
- All plugin logs now follow the `Logger` convention (info/warn/error/debug) rather than raw `console` calls.

## PatchCord V16 — Major UI and Cloud Update

### Highlights
- Redesigned the Custom Badges settings panel for better usability and visual polish.
- Improved badge browsing with a preview modal for full-size badge images.
- Polished the custom badge sort dropdown and type selection box to remove the harsh white UI and replace it with a subtle branded surface.
- Added a refresh button to manually reload badge metadata from the PatchCord badge API.
- Updated the PatchCord banner card to render with a proper `<img>` and overlay styling for improved reliability.
- Built a functioning PatchCord Cloud backend endpoint with PHP storage and CORS support for badge sharing and requests.
- Hardened server hosting compatibility with `.htaccess` rules to avoid rewrite redirects that break browser preflight requests.

### UI Improvements
- Custom Badges panel now shows summary stats for users and total badges.
- Search and sort toolbar has been reworked for a cleaner, more compact layout.
- Added smooth hover and card transition effects across badge cards.
- Badge preview opens in a modal so users can inspect custom badges at larger sizes.
- Enhanced the badge chip display with improved hover scaling and shadow styling.

### Backend / Cloud Hosting
- Implemented `cloud/index.php` with support for POST/GET JSON save/load operations and proper CORS headers.
- Added preflight `OPTIONS` handling so modern browsers can communicate cleanly with the cloud endpoint.
- Created a dedicated `cloud/data` storage directory for JSON persistence.
- Added `.htaccess` rules to allow CORS, disable problematic rewrites, and keep JSON file access working in shared hosting environments.

### Fixes and Quality of Life
- Resolved PatchCord banner/button rendering issues caused by background image styling.
- Improved the custom badge ID copy button UX with copy confirmation toasts.
- Ensured the custom badge panel gracefully handles loading failures and empty states.
- Added a proper changelog document for major release notes and update tracking.

### Notes
- This update focuses on both front-end settings UX and the stability of the new PatchCord Cloud workflow.
- Any future cloud endpoint changes should keep CORS headers consistent and avoid silent host redirects.
