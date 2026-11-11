# ListRow

A full-width tappable row with a chevron. It shows a label, or a caption over a value, as in the app's Change Card Linkage screen.

Use it for choices that open another screen (choose a funding account or payee) and for people in a split. `selected` draws the red outline the app uses for the current choice. The consumer supplies `label`, plus optional `caption`, `leading` (an Avatar or Icon), `trailing` (Money) and `onClick`. Set `chevron={false}` when the row doesn't open anything.

_hand-written from `src/components/ui.tsx` (aryaman-agarwal/sc4025-dbs-smartsplit@c703620) and restyled after the DBS app screenshots._
