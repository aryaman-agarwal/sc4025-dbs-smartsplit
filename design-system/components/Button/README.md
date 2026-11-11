# Button

Buttons for actions: one uppercase red CTA per screen, a quiet secondary, a red text link and an outlined pill.

- **primary**: the full-width uppercase CTA at the bottom of a flow ("NEXT", "PAY AMY", "APPROVE"). Fill `brand-strong`, `radius-sm`, `button` text style. Only one per screen.
- **secondary**: the other choice in a pair (Decline, Split equally). White with a `line` border.
- **link**: an inline red text action ("Invest now", "Settle now") in `brand-strong`.
- **pill**: a small outlined pill for account-level actions ("LOG OUT"). Inside `HeroHeader` it turns white.

Pass `block` for full width. The consumer supplies the label and `onClick`, plus any native button props. Labels say the outcome ("Pay Amy SGD 130.00"), not "OK".

_hand-written from `src/components/ui.tsx` (aryaman-agarwal/sc4025-dbs-smartsplit@c703620) and restyled after the DBS app screenshots._
