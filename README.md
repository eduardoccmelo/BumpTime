# ENTRE

A fast, local-first contraction timer. No account, server, or data collection—history is saved only on the device.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Features

- One large start/stop button
- Frequency (start to start) and duration displayed together
- Editable history, deletion, and persistent undo
- Frequency chart and simple pattern analysis
- Portuguese and English interface
- Local persistence via `localStorage`

## Deploy on Vercel

The repository is already configured for Vercel. Import the GitHub repository at [vercel.com/new](https://vercel.com/new), leave the detected Vite settings in place, and select **Deploy**. No environment variables are required.

Alternatively, use the CLI:

```bash
npx vercel
```

> This app is a record-keeping tool and does not replace guidance from an obstetric care team.
