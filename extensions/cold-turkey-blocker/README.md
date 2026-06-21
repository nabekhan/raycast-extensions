# Cold Turkey Blocker for Raycast

A cross-platform Raycast extension for controlling Cold Turkey Blocker from macOS or Windows without manually composing CLI commands.

## Commands

- **Manage Blocks** — reads `-list-blocks`, recognizes Website & App and Device sections, then checks each returned block with `-status` one at a time.
- **Start Block** — starts unlocked, uses saved settings (`-as-is`), or applies a timed, password, or random-text lock.
- **Add Website or Exception** — adds one or many entries, one per line, to Website & App blocks only.
- **Create Block** — checks for duplicate names, creates a website/app or device block, then confirms it appeared in `-list-blocks`.
- **Control Break** — starts a delay-break countdown or stops delay/random-text breaks.
- **CLI Diagnostics** — runs a safe, read-only report using only `-help`, `-list-blocks`, and sequential `-status` checks.

The extension covers these CLI forms:

```text
-list-blocks
-status "Block Name"
-start "Block Name"
-start "Block Name" -as-is
-start "Block Name" -lock X
-start "Block Name" -password X
-start "Block Name" -random-text X
-stop "Block Name"
-stop "Block Name" -password X
-toggle "Block Name"
-add-block "Block Name"
-add "Block Name" -web "URL"
-add "Block Name" -exception "URL"
-add-device-block "Block Name"
-add-device-block "Block Name" -sign-out
-add-device-block "Block Name" -shut-down
-start-delay-break "Block Name"
-stop-delay-break "Block Name"
-stop-random-text-break "Block Name"
```

## Reliability behavior for Cold Turkey 4.9

Cold Turkey mutation commands commonly return no text when successful. The extension therefore does not treat an empty response as proof of a state change:

- CLI processes are serialized so status probes and mutations cannot overlap.
- `-list-blocks` is parsed into Website & App and Device sections; section headings are never queried as block names.
- Start, stop, password-stop, and toggle actions poll `-status` until the expected state is confirmed.
- Creation is confirmed by polling `-list-blocks`.
- Output beginning with `Error:` is treated as a failure even if the native process happens to return exit code 0.
- UTF-8 and UTF-16LE output are supported for macOS and Windows compatibility.

`-status` reports only **Enabled** or **Disabled**. It does not reveal the lock type, remaining lock time, or whether a break workflow is active.

For device blocks, a basic `-start` enables the configured schedule. It does not necessarily activate the lock-screen, sign-out, or shut-down action immediately. A timed `-lock` start may activate that action immediately.

`-stop-random-text-break` controls a configured random-text **break**. It does not remove a random-text **block lock**.

## Install for local use

Requirements: Raycast, Cold Turkey Blocker, Node.js, and npm.

```bash
unzip cold-turkey-raycast-extension.zip
cd cold-turkey-raycast-extension
npm install
npm run setup -- YOUR_RAYCAST_USERNAME
npm run dev
```

`author` must be a real Raycast Store handle. The setup command writes it to `package.json`; it does not contact Raycast or change any other setting.

### Updating an existing development copy

The in-place update archive excludes `package.json`, so it can be extracted over the current folder without replacing your Raycast author handle. Then run:

```bash
node scripts/upgrade-manifest-v1.1.0.mjs
npm run dev
```

The dependencies did not change from 1.0.0, so `npm install` is normally unnecessary for this update.

### Windows requirement

Before using a CLI-backed command, close the Cold Turkey interface, right-click its system-tray icon, and select **Exit**. If it is still running, the extension may time out and will show the same reminder.

## Executable defaults

```text
macOS:   /Applications/Cold Turkey Blocker.app/Contents/MacOS/Cold Turkey Blocker
Windows: C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe
```

Change **Cold Turkey Executable** in Raycast’s extension preferences when the application is installed elsewhere. The path can be entered with or without matching outer quotes.

## Safety and privacy

Locking actions and `-as-is` starts ask for confirmation by default because a saved configuration can activate a lock or a device block. The confirmation can be disabled in extension preferences.

Passwords entered in forms are never saved by this extension. They are passed directly to the Cold Turkey process as command arguments, so they may be visible briefly to operating-system process-inspection tools while the command runs.

The extension uses `execFile(executable, args)` rather than a shell. Block names, URLs, and passwords are passed as distinct arguments instead of being interpolated into a command string.

## Development

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run lint` validates the Raycast username and manifest against Raycast’s services, so it needs internet access and a valid author value. The source itself can be checked with `npx eslint .`.

## License

MIT
