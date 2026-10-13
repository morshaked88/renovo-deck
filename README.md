# Renovo — Investor Presentation (Next.js)

One-page, slide-by-slide presentation. Next.js (App Router, TypeScript), GSAP + ScrollTrigger, Hebrew/RTL default with EN/LTR toggle.

    npm install
    npm run dev          # http://localhost:3000
    npm run build && npm start

- Content/i18n: `lib/i18n.ts` (single dictionary, `he` + `en`). Slides: `components/Deck.tsx`. Styles: `app/globals.css`.
- Language persists in `localStorage` (`renovo-lang`). Keys: arrows/PageUp/PageDown/Space (horizontal arrows follow reading direction), Home/End, `F` = fullscreen.
- PDF export: browser Print → Save as PDF (landscape 16:9 `@page`, animations settled automatically).
- Open items: see `TODO.md`.
