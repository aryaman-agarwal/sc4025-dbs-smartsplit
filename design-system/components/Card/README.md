# Card

A white card with a heading, an optional count chip, and a right-aligned caption and amount, like the app's Deposits and Cards tiles.

Use it for groups, balances and vaults on a sheet. Layout follows the app: the title is top left (`card-title` in `ink-2`), with the caption (`muted`) and the amount right-aligned below. Put two cards side by side for paired figures, or one full width for the main one. Give it `onClick` to make the whole card a button. The consumer supplies `title`, an optional `count`, `meta` and `cents` (integer cents), or any `children`.

_hand-written from `src/components/ui.tsx` (aryaman-agarwal/sc4025-dbs-smartsplit@c703620) and restyled after the DBS app screenshots._
