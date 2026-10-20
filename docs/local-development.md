# Local Codex development

This guide installs the generated Codex plugin and the local stdio MCP as two
separate development artifacts. It is verified for Linux x64 with Node.js
22.20.0 or newer. It does not publish packages, install a second global copy of
the skills, configure Claude, or change a public-release status.

Use either the personal Codex plugin documented here or global skill copies
through the pinned `skills` CLI. Do not install both versions of this collection:
they expose duplicate workflows with different update paths.

For the runtime data-root, version, review, task-pin and interruption-recovery
contract, read the [product workflow guide](product-workflows.md). The installation
backup below protects client configuration and installed artifacts; it is not a
backup of the shared product store.

## Build a snapshot

From the repository root, run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build:dev
```

`build:dev` builds the MCP, checks generated bundles and validation, then creates
`artifacts/dev/<build-id>/`. The directory contains only:

- `plugin/`: the generated Codex plugin;
- `mcp/*.tgz`: the packed `engineer-agent-workflow-mcp` package;
- `manifest.json`: source digest, artifact digests, skill names and tool versions.

The build ID is derived from every Git-tracked and non-ignored source file,
including local uncommitted changes. Identical input reuses a complete existing
snapshot; a changed input creates another one. The builder never replaces a
snapshot and removes its staging directory after an error.

Run the full check set before installing a snapshot:

```bash
npm run lint
npm test
npm run validate:foundation
npm run generate:check
git diff --check
```

### Test concurrency

The default `npm test` command uses Node's process-isolated test runner. Each
test file runs in a separate child process, with at most eight test processes
running concurrently in this project.

The explicit parallel command uses the same eight-process ceiling:

```bash
npm run test:parallel
```

To use fewer processes for a constrained machine, pass a lower limit. Values
above eight are rejected rather than silently increasing the project ceiling:

```bash
npm run test:parallel -- --test-concurrency=4
```

Use the serial mode to diagnose shared-state or ordering failures:

```bash
npm run test:serial
```

## First installation

Choose the newly created `<build-id>` from `artifacts/dev/`. The commands below
use explicit paths; replace each placeholder before running them. Keep the
development data outside the repository, for example under
`/home/<user>/.local/share/engineer-agent-workflows`.

First create a dated backup directory and copy only any existing affected files
into it: the personal marketplace file, the local plugin directory and the
Codex configuration file. Do not print those files because they can contain
unrelated private configuration.

Install the MCP archive into its own version directory without lifecycle
scripts. It receives its own `node_modules` and lockfile:

```bash
npm install --prefix <data-root>/mcp/versions/<build-id> \
  --ignore-scripts --no-audit --no-fund --package-lock \
  <repository>/artifacts/dev/<build-id>/mcp/<archive>.tgz
```

Before changing Codex configuration, use the installed package to verify its
stdio startup, `tools/list`, and a read-only `specification_list` call against a
temporary project. Then switch `<data-root>/mcp/current` atomically to the
verified version. The `current` path is the only MCP path registered in Codex.

Create the local plugin source through the installed `plugin-creator` helper,
which also preserves any personal marketplace entries. Copy the snapshot's
`plugin/` contents over that local source, validate it, and apply the helper's
cachebuster only to this local copy. The canonical plugin in the repository and
the immutable snapshot remain unchanged.

```bash
python3 <plugin-creator>/scripts/create_basic_plugin.py \
  engineer-agent-workflows --with-marketplace
cp -a <repository>/artifacts/dev/<build-id>/plugin/. \
  <user-home>/plugins/engineer-agent-workflows/
python3 <plugin-creator>/scripts/validate_plugin.py \
  <user-home>/plugins/engineer-agent-workflows
python3 <plugin-creator>/scripts/update_plugin_cachebuster.py \
  <user-home>/plugins/engineer-agent-workflows
python3 <plugin-creator>/scripts/read_marketplace_name.py
```

Use the printed marketplace name in the standard installation command:

```bash
codex plugin add engineer-agent-workflows@<marketplace-name>
codex mcp add engineer-agent-workflow-mcp -- \
  <absolute-node-path> \
  <data-root>/mcp/current/node_modules/@engineer-agent-workflows/engineer-agent-workflow-mcp/dist/main.js
```

The first command installs one personal plugin. The second command is a
one-time MCP registration; it points at the stable `current` link. Never edit
Codex's plugin cache or `config.toml` directly.

Start a new Codex task after installation. It is the boundary at which Codex
loads the new explicit-only skills and MCP tools.

## Update and rollback

For every source change: build a new snapshot, run the check set, install and
verify its MCP package in a new version directory, atomically switch `current`,
copy its plugin into the local plugin source, run `update_plugin_cachebuster.py`,
and rerun `codex plugin add` with the personal marketplace name. A new Codex
task then picks up both components.

To roll back, select a previous verified snapshot, reinstall or reuse its MCP
version directory, repoint `current`, restore that snapshot's plugin to the
local source, apply a fresh cachebuster and reinstall the plugin. Restore the
saved personal files only if the normal rollback cannot recover the expected
state. The snapshot directories are retained specifically for this operation.
