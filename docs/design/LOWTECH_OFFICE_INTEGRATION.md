# LowTech Office — additive integration

The Office plugin lives in `packages/plugins/plugin-office-poc/`. The Coordinator keeps its existing navigation; one SDK sidebar slot for `vpd-office-poc` is mounted after Recents. The slot resolves the currently selected company and disappears when the plugin is disabled or unavailable. Office data is read through the company-scoped plugin bridge with `agents.read`, `issues.read`, and `approvals.read`; no write capability is declared.

## Activate in an isolated instance first

1. Build with `pnpm --filter @paperclipai/plugin-office-poc build` and run its tests. Build the host UI with `pnpm --filter @paperclipai/ui build`.
2. Start a separate Paperclip instance with its own `PAPERCLIP_HOME` and port. Leave Hoàng's current instance, database, API keys, agent/task records, and configuration untouched.
3. In that instance, use the administrator plugin UI or `paperclipai plugin install ./packages/plugins/plugin-office-poc`, then `paperclipai plugin enable vpd-office-poc`. Confirm the manifest's read capabilities before approval. Install is instance-wide; the Office snapshot remains company-scoped.
4. Select a test company, open **Office** at the end of Coordinator navigation, and verify agent/task data. Change the selected company and verify that the roster and tasks change or become unavailable as access dictates. The `OFFAA` fixture and port 3101 are test evidence only; neither is required by the plugin.

## Rollback

Disable with `paperclipai plugin disable vpd-office-poc` (or the administrator plugin UI). The Office slot disappears; Coordinator's existing pages remain. Restore the previous host build if necessary. Do not reset or migrate a running database to roll back this UI integration.

## Current qualification limits

The local `origin/main` ref is commit `31e3583f`; changes Hoàng has not published cannot be compared here. Browser evidence from the existing port-3101 test host is not proof that this final integration branch has been installed there. The embedded PostgreSQL tenant-scope integration test is blocked by the pre-existing migration hash guard on this Windows checkout; do not bypass that guard or change migration SQL. Require a clean isolated host and final-revision CI before deployment.
