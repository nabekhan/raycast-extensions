# Upgrade an Existing Development Copy

## Using the in-place update archive

1. Stop the current development process with `Ctrl+C`.
2. Extract the in-place update archive over the existing extension folder.
3. From that folder, update the manifest while preserving your current Raycast author handle:

```bash
node scripts/upgrade-manifest-v1.1.0.mjs
```

4. Restart development mode:

```bash
npm run dev
```

The dependencies did not change, so `npm install` is normally unnecessary for the in-place update.

## Using the full release archive

After extracting the full archive into a new folder, set the author and start development mode:

```bash
npm install
npm run setup -- YOUR_RAYCAST_USERNAME
npm run dev
```

Open **Manage Blocks** and press `⌘ R` once. Version 1.1.0 uses a new cache key, so old phantom heading entries should disappear automatically after the first load.

For troubleshooting, enable **CLI Diagnostics** in Raycast settings. The diagnostics command is read-only and checks each listed block with `-status` sequentially.
