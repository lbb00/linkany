# linkany

[English](README.md) | [中文](README.zh-CN.md)

`linkany` is a **safe symlink manager** for **macOS/Linux**. It manages a set of `source ↔ target` symlink mappings via a `manifest` file (or an in-memory manifest), with a strong focus on **safety**, **traceability**, and **refusing risky operations by default**.

## CLI

`linkany` ships both a **library API** and a **CLI**. The CLI supports setting a **global default manifest** so you don’t have to pass `--manifest` every time.

### Set / show default manifest

- Set default manifest (written to global config; path is resolved to an absolute path):
  - `linkany manifest set ./linkany.manifest.json`
- Show current default manifest:
  - `linkany manifest show`
- Clear default manifest:
  - `linkany manifest clear`

### Manifest resolution priority

- **Priority**: `-m/--manifest <path>` (one-off override) > global default manifest
- Examples:
  - Use default manifest: `linkany install`
  - Override once: `linkany install -m ./other.manifest.json`

### Common commands

- `linkany add --source <path> --target <path> [--kind file|dir] [--atomic|--no-atomic] [-m <manifest>] [--dry-run] [--plan] [--no-audit]`
- `linkany remove <key> [--keep-link] [-m <manifest>] [--dry-run] [--plan] [--no-audit]`
- `linkany install [-m <manifest>] [--dry-run] [--plan] [--no-audit]`
- `linkany uninstall [-m <manifest>] [--dry-run] [--plan] [--no-audit]`

### Global config path (XDG)

- If `XDG_CONFIG_HOME` is set: `$XDG_CONFIG_HOME/linkany/config.json`
- Otherwise: `~/.config/linkany/config.json`
- Format:

```json
{ "manifestPath": "/abs/path/to/manifest.json" }
```

## Features

- **Symlink-only**: if symlink creation fails (permissions/filesystem), it errors; no “copy fallback”.
- **Files & directories**: supports both.
- **Safety rules**:
  - `add`: refuses when `source` and `target` both exist and `target` is not already a symlink to `source`.
  - `remove/uninstall`: only removes the target symlink; **never deletes sources**.
  - `install`: if any `target` exists but is not a symlink, it **aborts the entire run** to avoid harming real files/dirs.
- **Atomic (best-effort)**:
  - Creates/replaces symlinks via `target.tmp.<rand>` then `rename` into place.
  - When replacing an existing symlink, it first moves the old target to `target.bak.<timestamp>.<rand>` (easier recovery).
- **Audit log (optional)**: appends each operation’s `Result` to a JSONL file (default `${manifestPath}.log.jsonl`), unless disabled.
- **dry-run / plan**:
  - `opts.dryRun=true` performs no filesystem writes.
  - `opts.includePlanText=true` returns a human-readable plan in `Result.planText`.
- **Rollback protocol (best-effort)**: `Result.rollbackSteps` contains a best-effort reverse plan (protocol/data only; no one-shot rollback API yet).

## Manifest format (v1)

```json
{
  "version": 1,
  "installs": [
    {
      "id": "optional-stable-id",
      "source": "path/to/source",
      "target": "path/to/target",
      "kind": "file",
      "atomic": true
    }
  ]
}
```

Notes:

- `source/target` can be absolute or relative; relative paths are resolved against the **manifest file directory**.
- `id` is optional. If absent, `target` is used as the entry identity (e.g., for `remove`).
- `kind` is optional: `file | dir`. If omitted, `add` tries to infer; `install` infers from the actual source.
- `atomic` defaults to `true`.
- Extra fields are allowed and preserved on write-back.

## API

All 4 core APIs accept `manifest` in two forms:

- **File mode**: `manifest` is a manifest file path (`string`)
- **In-memory mode**: `manifest` is a manifest JSON/object

All 4 core APIs return:

- `{ result, manifest }` where `result` is the operation result and `manifest` is the updated manifest object.

### `add(manifest, { source, target, kind?, atomic? }, opts?)`

Writes/updates a mapping in the manifest and converges `target` to `symlink(source)`.

Key semantics:

- If `source` is missing: creates an empty source (file: empty file; dir: empty dir).
- If `target` exists and is not a symlink while `source` is missing: performs a safe migration:
  - copy `target -> source`
  - move original `target` to `target.bak.<timestamp>.<rand>`
  - then make `target` a symlink to `source`
- If `source` and `target` both exist: refuses with an error (requires manual conflict resolution).

### `remove(manifest, key, opts?)`

Removes a mapping from the manifest and by default deletes the **target symlink**.

- `key`: matches `id` first, then `target`.
- `opts.keepLink=true` removes the manifest entry only (does not delete the symlink).
- Never deletes sources.

### `install(manifest, opts?)`

Applies all entries: ensures each `target` is a symlink pointing to `source`.

Safety:

- Aborts without changes if any:
  - source is missing
  - target exists but is not a symlink

### `uninstall(manifest, opts?)`

Removes all target symlinks listed in the manifest; never deletes sources.

### In-memory mode: extra options

When `manifest` is a JSON/object, `opts` also supports:

- `baseDir?: string` (default: `process.cwd()`) for resolving relative paths
- `manifestPath?: string` for `Result.manifestPath` and audit default-path derivation only (does not read/write manifest files)

## Audit log

- Default path: `${manifestPath}.log.jsonl`
- Each line is one JSON object (a full `Result`), including steps, errors, duration, change summary.
- Customize with `opts.auditLogPath`.
- Disable completely (caller handles logging): `opts.audit=false` (CLI: `--no-audit`).

## Options (opts)

Common options (`CommonOptions`) for all APIs:

- `audit?: boolean` (default: true)
- `auditLogPath?: string`
- `dryRun?: boolean`
- `includePlanText?: boolean`
- `logger?: { info/warn/error }`

## Project layout

```text
src/
  api/        # high-level operations
  core/       # plan/apply/fs/audit/runner/backup
  manifest/   # manifest types and IO
  cli/        # CLI helpers (global config)
  cli.ts      # CLI entrypoint (argv parsing & dispatch)
  index.ts    # public exports
  types.ts    # shared types (Result/Step/Options)
```

More maintainer notes: `KNOWLEDGE_BASE.md`.
