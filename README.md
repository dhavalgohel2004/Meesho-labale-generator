# Meesho Label Generator

Client-side tool that combines Meesho `Sub_Order_Labels` PDFs onto A4 sheets for easier printing.

## What it does

- Keeps each Meesho page **exactly as-is** (shipping label + tax invoice — **no cropping**)
- Default layout: **4 labels per A4** (2×2 grid)
- Toggle: **2 labels per A4** (stacked, larger print)
- Auto paging: 8 labels → 2 sheets; 3 labels → 1 sheet with one empty cell
- Runs entirely in your browser — files are not uploaded to a server

## Print tip

Always print at **Actual size / 100%**. Never use “Fit to page”.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Deploy on Vercel (free)

1. Push this repo to GitHub (already configured as `Meesho-labale-generator`).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
3. Framework preset: **Vite** (Build: `npm run build`, Output: `dist`).
4. Deploy — you get a free `*.vercel.app` URL.

Or with the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## Stack

- Vite + React + TypeScript
- pdf-lib (vector page embed — no raster quality loss beyond intentional scale)
