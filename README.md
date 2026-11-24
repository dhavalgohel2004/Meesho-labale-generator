# Meesho Label Generator

Client-side tool that combines Meesho `Sub_Order_Labels` PDFs onto A4 sheets for easier printing.

## What it does

- **Without invoice (default):** crops the shipping label only and packs **8 labels per A4** (2×4)
- **With invoice:** keeps each Meesho page exactly as-is and packs **4 full pages per A4** (2×2)
- Tight margins so labels print as large as possible
- Auto paging with blank leftover cells
- Runs entirely in your browser — files are not uploaded to a server
- Mobile-friendly canvas preview (no iframe PDF viewer)

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

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
3. Framework preset: **Vite** (Build: `npm run build`, Output: `dist`).
4. Deploy — you get a free `*.vercel.app` URL.

## Stack

- Vite + React + TypeScript
- pdf-lib (vector page embed)
- pdfjs-dist (on-screen preview canvases)
