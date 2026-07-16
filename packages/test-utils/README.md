# @superbull/test-utils

Private workspace package (not published to npm). Shared Redis fixtures and the server-adapter contract battery for the [superbull monorepo](https://github.com/mikewuu/superbull).

- `runServerAdapterContract(name, setup)`: the contract suite every server adapter package (`@superbull/express`, `@superbull/fastify`, ...) runs against a real HTTP server, so all nine adapters prove identical behavior for the same route table.
- `seedQueue(prefix?)` and `connection`: BullMQ queue fixtures against the local test Redis.
- `uiFixtureBasePath`: a miniature `dist/` layout mirroring the real `@superbull/react` build, so `createBoard` resolves views and statics exactly like production.

Peer dependencies: `bullmq` and `vitest`. Tests that use the fixtures need a local Redis on port 6379 (see the root README's Development section).
