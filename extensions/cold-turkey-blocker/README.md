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

Install dependencies:

```bash
npm install
```

Run the extension locally in Raycast development mode:

```bash
npm run setup -- YOUR_RAYCAST_USERNAME
npm run dev
```

Run the local quality checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run lint` runs Raycast’s extension validation, including manifest and author/username checks against Raycast’s services. It therefore requires internet access and a valid `author` value in `package.json`.

For source-only linting without Raycast service validation, use:

```bash
npx eslint .
```

### Cold Turkey CLI reports

The project includes a safe Cold Turkey CLI behaviour-report generator. It records raw CLI behaviour, including stdout, stderr, exit code, timing, and output hashes. It does not infer semantic success or failure from Cold Turkey’s undocumented output format.

Generated reports are written to:

```bash
.cold-turkey-reports/
```

This directory should remain gitignored.

Common report commands:

```bash
npm run ct:report
npm run ct:report:status
npm run ct:report:lab
npm run ct:report:lab-full
```

Recommended full safe report:

```bash
npm run ct:report:lab-full
```

The report generator supports these options:

```bash
node scripts/generate-cold-turkey-report.mjs [options]
```

Available options:

```text
--lab
  Enable lab mode. Uses a harmless website/app test block for controlled command snapshots.

--include-device-blocks
  In lab mode, also create test device-block definitions. Device blocks are never started.

--include-password-lock
  In lab mode, test password lock/unlock behaviour on the harmless website/app test block only.

--status-all
  Run read-only status snapshots for all blocks returned by -list-blocks.

--status-block "Block Name"
  Run a read-only status snapshot for a specific existing block. Can be used multiple times.

--ct-path "/path/to/Cold Turkey Blocker"
  Override the detected Cold Turkey executable path.

--out ./path
  Override the report output directory. Defaults to ./.cold-turkey-reports/.

--test-block "Name"
  Override the harmless website/app test block name. Defaults to Raycast_Report_Test.

--test-password "password"
  Override the password used for optional password-lock testing. The value must avoid spaces and quotes.

--test-device-block "Name"
  Override the standard test device-block name.

--test-signout-device-block "Name"
  Override the sign-out test device-block name.

--test-shutdown-device-block "Name"
  Override the shut-down test device-block name.
```

You can also override the Cold Turkey executable path with an environment variable:

```bash
CT_BLOCKER_PATH="/custom/path/to/Cold Turkey Blocker" npm run ct:report
```

Safety notes:

* Default report mode only runs read-only commands.
* Lab mode modifies only controlled test blocks.
* Device block creation is optional and safe because created device blocks are never started.
* The report generator never starts device blocks.
* The report generator never runs timed locks, random-text locks, sign-out actions, or shutdown actions.
* Repeated lab runs may leave test block definitions in Cold Turkey because the CLI does not expose a delete-block command.

## License

MIT
