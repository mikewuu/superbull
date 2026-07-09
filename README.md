# bullwatch

A restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io) — inspired by the
UX of trigger.dev, styled in a clean light theme like dub. Embeds into your existing app
via a thin server adapter (Express, Fastify, Hono, Koa, H3, Hapi, Elysia, Bun, NestJS) and
uses your app's own `bullmq` instance, so job actions are always version-correct.

## Packages

| Package | Description |
| --- | --- |
| `@bullwatch/api` | Framework-agnostic core: queue adapter, route table, request handlers |
| `@bullwatch/react` | The dashboard UI (React + Vite), served as static assets |
| `@bullwatch/express` | Express server adapter |
| `@bullwatch/fastify` | Fastify server adapter |
| `@bullwatch/hono` | Hono server adapter |
| `@bullwatch/koa` | Koa server adapter |
| `@bullwatch/h3` | H3 server adapter |
| `@bullwatch/hapi` | Hapi server adapter |
| `@bullwatch/elysia` | Elysia server adapter |
| `@bullwatch/bun` | Bun server adapter |
| `@bullwatch/nestjs` | NestJS module |

## Development

```bash
pnpm install
pnpm build
pnpm test      # requires a local Redis on 6379
pnpm dev
```

## License

MIT © Mike Wu. Server-adapter architecture derived from
[bull-board](https://github.com/felixmosh/bull-board) (MIT).
