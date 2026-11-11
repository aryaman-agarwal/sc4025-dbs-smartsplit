# Money

Formats integer cents as an amount with a muted "SGD" before the number, as the app shows balances.

Always pass **integer cents** (the domain rule: shares sum exactly to the bill). Figures are tabular. `lg` for headline balances, `md` in rows and small cards, `sm` inline. At `lg` the prefix is `subtle` and smaller, as in the app; at `md`/`sm` it switches to `muted` so it stays readable. Set `currency={false}` to drop the prefix.

_hand-written from `src/components/ui.tsx` (aryaman-agarwal/sc4025-dbs-smartsplit@c703620) and restyled after the DBS app screenshots._
