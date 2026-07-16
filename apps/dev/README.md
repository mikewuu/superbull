# @superbull/dev

Private workspace app (not published). The local development harness for the [superbull monorepo](https://github.com/mikewuu/superbull): an Express server that mounts the dashboard via `@superbull/express`, plus seed data and the standalone-adapter e2e suite.

## Commands (from the repo root)

```bash
pnpm --filter @superbull/dev seed   # reset and seed the demo queues (send-emails, process-videos, sync-contacts)
pnpm --filter @superbull/dev dev    # dashboard at http://localhost:3333 (tsx watch)
pnpm --filter @superbull/dev e2e    # Playwright e2e against the standalone board
```

`seed:live` keeps workers running so the board shows live activity. Requires a local Redis.

## Environment variables

| Var | Default |
| --- | --- |
| `REDIS_HOST` | `127.0.0.1` |
| `REDIS_PORT` | `6379` |
| `PORT` | `3333` |
| `QUEUES` | unset: auto-discovers queues by scanning `bull:*:meta` |
