# @superbull/react

The prebuilt dashboard UI for [SuperBull](https://superbull.com), a restyled, feature-rich dashboard for [BullMQ](https://docs.bullmq.io). React + Vite, shipped as static assets in `dist/`.

You do not import this package directly. It is a peer dependency of [@superbull/api](https://www.npmjs.com/package/@superbull/api): `createBoard` resolves the UI build from `@superbull/react/package.json` by default and the server adapters (`@superbull/express`, `@superbull/hono`, ...) serve it alongside the REST API. Installing it next to `@superbull/api` is all that is needed:

```bash
pnpm add @superbull/api @superbull/react bullmq
```

To point the board at a different UI build (for example a fork of this package), pass `options.uiBasePath` to `createBoard`.

Full docs: [superbull.com/docs](https://superbull.com/docs). Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
