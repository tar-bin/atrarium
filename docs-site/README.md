# Atrarium Documentation Site

This directory contains the VitePress documentation site for Atrarium.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run docs:dev
```

The dev server will start at `http://localhost:5173`

## Build

```bash
# Build static site
npm run docs:build

# Preview production build
npm run docs:preview
```

## Cloudflare Pages Configuration

### GitHub Integration Setup

1. Connect your GitHub repository to Cloudflare Pages
2. Configure build settings:
   - **Build command**: `npm run docs:build`
   - **Build output directory**: `docs-site/.vitepress/dist`
   - **Root directory**: `/` (or `docs-site` for monorepo)
3. Enable automatic deployments on `main` branch

### Environment Variables

No environment variables required for documentation site.

### Custom Domain (Optional)

Configure custom domain in Cloudflare Pages dashboard:
- Example: `docs.atrarium.com`
- Add CNAME record in your DNS provider

## Deployment

### Automatic (Recommended)

Push to `main` branch → Cloudflare Pages auto-deploys

### Manual (Wrangler CLI)

```bash
npm run docs:build
wrangler pages deploy .vitepress/dist --project-name=atrarium-docs
```

## Structure

```
docs-site/
├── en/                 # English documentation
├── ja/                 # Japanese documentation
├── .vitepress/
│   ├── config.ts       # Main configuration
│   ├── locales/        # Locale-specific config
│   └── theme/          # Custom theme
└── public/             # Static assets
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for documentation contribution guidelines.
