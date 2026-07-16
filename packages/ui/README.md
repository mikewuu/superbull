# @superbull/ui

Shared design system primitives for [SuperBull](https://superbull.com), used by the dashboard UI ([@superbull/react](https://www.npmjs.com/package/@superbull/react)) and the hosted web app. Not something a SuperBull user needs to install; it exists so the two frontends render identically.

Exports React components (`Button`, `Dialog`, `ConfirmDialog`, `Popover`, `PageHeader`, `Breadcrumbs`, `SearchInput`, `MenuItem`, `EmptyState`, `Skeleton`, `StatusBadge`, `JobStatusBadge`) plus the `jobStatuses` list, the `JobStatus` type, and the `cn` class-name helper. Design tokens ship as a CSS file importable from `@superbull/ui/tokens.css`.

`react` (`>=19.0.0`) is a peer dependency. Components are styled with Tailwind utility classes on top of Radix primitives.

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
