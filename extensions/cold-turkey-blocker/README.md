# Cold Turkey Blocker for Raycast

A cross-platform Raycast extension for controlling Cold Turkey Blocker from macOS or Windows without manually composing CLI commands.

## Commands

- **Manage Blocks** — the single default command. It lists every block, checks status, and exposes start, stop, lock, website, creation, and break workflows contextually.
- **CLI Diagnostics** — a disabled-by-default troubleshooting command that runs a safe, read-only report using only `-help`, `-list-blocks`, and sequential `-status` checks.

The former **Start Block**, **Add to Block**, **Create Block**, and **Control Break** root commands were removed from the manifest because the same workflows are available from **Manage Blocks** with the selected block already filled in.

## Interaction model

**Manage Blocks** is optimized around one selected block:

- **Enter** explicitly **starts unlocked** (or enables a device schedule with no lock), attempts to stop an enabled block, or refreshes a block whose status is unknown. When Cold Turkey reports that stopping requires a password, the extension opens the password form automatically.
- **Command–Enter** opens **Start Options** for a disabled block or read-only **CLI Diagnostics** when status is unknown. Enabled blocks no longer expose a separate password-stop action.
- **Start Options** is a complete form for **Start Unlocked (No Lock)**, saved settings, timed lock, password lock, or random-text lock. The unlocked choice is intentionally duplicated here so the form never hides a supported start mode.
- **Add Websites or Exceptions** is one form with a dropdown for the website list or exception list.
- **Control Break** is one form with a dropdown for starting or stopping the supported break workflows.
- **Command–N** opens one creation form. Website & App blocks can include optional initial website/pattern and exception lists; leaving both blank creates an empty block. The CLI does not expose application-entry creation, so apps are still added in Cold Turkey itself. Device blocks remain definition-only at creation time.
- **Command–R** refreshes blocks and statuses.
- Raycast’s native search matches block names plus status and type keywords such as `enabled`, `disabled`, `website`, and `device`; the extra filter dropdown was removed. Root Search keywords such as `create`, `add`, `exception`, `password`, and `schedule` still lead to **Manage Blocks** after the standalone commands are removed.
- Unknown status is treated as a diagnostic state: the extension offers refresh and read-only diagnostics instead of guessing whether a mutating command should start or stop the block.

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
- Start, stop, and password-assisted stop actions poll `-status` until the expected state is confirmed.
- A normal `-stop` is always attempted first. The password form appears only for Cold Turkey's password-lock parameter error, and an incorrect password is reported inline without closing the form.
- Creation is confirmed by polling `-list-blocks` before any optional initial entries are added.
- Initial website and exception entries are added sequentially after creation; exact duplicates and blank lines are ignored. A partial failure identifies the first failed entry and directs the user to retry from **Add Websites or Exceptions**.
- Output beginning with `Error:` is treated as a failure even if the native process happens to return exit code 0.
- UTF-8 and UTF-16LE output are supported for macOS and Windows compatibility.

`-status` reports only **Enabled** or **Disabled**. It does not reveal the lock type, remaining lock time, or whether a break workflow is active.

For device blocks, a basic `-start` enables the configured schedule. It does not necessarily activate the lock-screen, sign-out, or shut-down action immediately. A timed `-lock` start may activate that action immediately.

`-stop-random-text-break` controls a configured random-text **break**. It does not remove a random-text **block lock**.

## Install for local use

Requirements: Raycast, Cold Turkey Blocker, Node.js, and npm.

```bash
unzip cold-turkey-raycast-v1.3.2.zip
cd cold-turkey-raycast-v1.3.2
npm install
npm run setup -- YOUR_RAYCAST_USERNAME
npm run dev
```

`author` must be a real Raycast Store handle. The setup command writes it to `package.json`; it does not contact Raycast or change any other setting.

### Updating an existing development copy

The in-place update archive excludes `package.json`, so it can be extracted over the current folder without replacing your Raycast author handle. Then run:

```bash
node scripts/upgrade-manifest-v1.3.2.mjs
npm run dev
```

The dependencies did not change from 1.2.0, so `npm install` is normally unnecessary for this update.

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

- Default report mode only runs read-only commands.
- Lab mode modifies only controlled test blocks.
- Device block creation is optional and safe because created device blocks are never started.
- The report generator never starts device blocks.
- The report generator never runs timed locks, random-text locks, sign-out actions, or shutdown actions.
- Repeated lab runs may leave test block definitions in Cold Turkey because the CLI does not expose a delete-block command.

## License

MIT
