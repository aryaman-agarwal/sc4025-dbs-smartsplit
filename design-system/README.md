# DBS SmartSplit

The design system for **SmartSplit & GroupVault**, an SC4025 concept feature for splitting bills, settling up in one tap and pre-funding group trips inside a digibank-style app. It is built from the prototype's code (`aryaman-agarwal/sc4025-dbs-smartsplit@c703620`) and restyled to sit naturally inside the current DBS digibank app, using colours sampled from screenshots of its Home, Change Card Linkage and More screens.

> Concept only. Not affiliated with DBS Bank, and it uses no DBS logos. No real money moves in the demo.

## Content fundamentals

- **Say the money plainly.** "You owe SGD 130.00", "You are owed SGD 45.00", "Settled". Use your/you and the person's first name: "Pay Amy SGD 130.00".
- **Show the netting.** "4 debts → 2 payments. We netted everything so money doesn't move in circles." Short sentences, no jargon ("pro rata" becomes "SGD 50 from each reserve").
- **Write sentence case for titles and Title Case for features**: "Settle up", "Group Vault", "SmartSplit". CTA labels are uppercase in the button style (NEXT, APPROVE).
- **Be careful about scams.** Show payees as masked names (AMY T** L**), never a phone or account number field. Warn on a first-time payee. Reminders stay in-app with no links.
- **Write amounts as `SGD 1,234.56`**, with the currency in muted text and the figures tabular. Store them as integer cents.

## Visual foundations

- **Colour.** Red is the identity: use `brand` for dots, icons and pills, and `brand-strong` for anything with white text on it (4.7:1). Use `brand` (3.8:1 with white) only behind 18px+ bold text. Navy `ink` carries text and the tab bar, and grey `surface` is the page. Owe/owed use `owe` (burnt orange) and `owed` (green), which differ in lightness as well as hue and always come with words.
- **Layout.** The home screen is a red gradient `HeroHeader` with a white sheet overlapping it (`radius-lg` top corners, faint `sheet` pink). Below that come a row of up to five `QuickAction` discs, a plain section title, then cards. Other screens have a white `ScreenHeader`, grey `surface`, full-width `ListRow`s, and one uppercase primary CTA pinned at the bottom. The gutter is `space-4`.
- **Cards** are white, `radius-md`, with a `line` border and `shadow-card`. The title is top left and the caption and amount are right-aligned, as in the app's Deposits tile. Pair two small cards in a row.
- **Type.** Inter (the repo's stack; the app's own face isn't public). Use `balance` for headline amounts, `screen-title` for headers, `section-title` uppercase for grey bands, and `button` uppercase for CTAs.
- **Shape.** The CTA has squared-off `radius-sm` corners. Cards and tiles use `radius-md`, the sheet and tab bar `radius-lg`, and discs, pills and avatars `radius-full`.
- **Accessibility.** Text is 4.5:1 or better on its ground. `subtle` (the app's own light grey, 3.5:1) is kept only for the large "SGD" prefix on headline balances. Focus rings use 2px `ink`.

## Iconography

Line icons at 24px with a 1.8 stroke, round caps and `currentColor`. They're red on `brand-soft` discs and grey on white tiles. The `Icon` component holds the SmartSplit set, and the React app uses the matching lucide-react icons (ChevronLeft, Bell, Receipt, PiggyBank, Users, ArrowRightLeft…). No emoji. The app mark is in Logos.

## Components

These are `window.SmartSplit` components, hand-written from `src/components/ui.tsx` and restyled: Button, Card, Money, Badge, Avatar, PositionLabel, Banner, SectionTitle, ListRow, QuickAction, ScreenHeader, HeroHeader, TabBar, Field and Icon. The new ones (ListRow, QuickAction, HeroHeader, TabBar, Badge) come from the app screenshots.

## Not synced

- **Changed from the repo:** `--color-brand` `#e60000` becomes `brand-strong` `#d9333e` / `brand` `#eb483f`. `--color-ink` `#1d1d1f` becomes `#1b2732`, `--color-muted` `#6b7280` becomes `#5c636a`, `--color-line` `#e5e7eb` becomes `#dfe3e7`, and `--color-surface` `#f5f5f7` becomes `#f5f7f9`. The Cal and Dee avatar colours are darkened to pass contrast. Update `src/index.css` and `src/data/seed.ts` to match.
- **Banner tones** are rewritten as hex in place of Tailwind's sky, amber, red and emerald.
- **Fonts:** Inter isn't bundled in the repo, so it's named in the stack only. Load it from Google Fonts or self-host it.
- **Not built:** `TodoPanel` (a team scaffold), `PhoneFrame` and `DemoToolbar` (demo chrome). The components are hand-written rather than built from the repo, so they're not the React source.
