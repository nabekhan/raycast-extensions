# Changelog

## 1.1.0 — 2026-06-21

- Fixed Cold Turkey 4.9 block-list parsing so `Website & App Blocks` and `Device Blocks` are section headers rather than phantom blocks.
- Added typed Website & App and Device block handling, valid-action filtering, and clearer device-start semantics.
- Serialized every native CLI process and changed status loading to list first, then query each block sequentially.
- Added retrying state verification after start, stop, password-stop, and toggle actions.
- Added block-list verification after creation and a duplicate-name preflight check.
- Added semantic handling for `Error:` output even when the process exit code is successful.
- Added UTF-16LE output decoding for Windows CLI compatibility.
- Reworked CLI Diagnostics into a safe, read-only block/status report.
- Clarified that `-status` does not expose lock details and that random-text break controls do not remove random-text block locks.
- Added Cold Turkey 4.9 parser fixtures and output-decoding tests.

## 1.0.0 — 2026-06-21

- Added cross-platform macOS and Windows manifests and executable defaults.
- Added block listing with per-block status and contextual actions.
- Added all start modes, including `-as-is`, timed, password, and random-text locks.
- Added password-based stopping, website/exception entry, block creation, device-block creation, and break controls.
- Added confirmation prompts for potentially locking actions and a diagnostics command.
- Added defensive CLI-output parsing, unit tests, and production build configuration.
