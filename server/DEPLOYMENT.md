# Deployment Validation Checklist

Use this checklist to verify production deployment of the Atrarium documentation site.

## Pre-Deployment

- [ ] All documentation pages created (en/ and ja/)
- [ ] Navigation config verified (sidebar and navbar)
- [ ] Internal links tested (no 404s)
- [ ] i18n parity confirmed (all en/ pages have ja/ equivalents)
- [ ] Local build succeeds: `npm run docs:build`
- [ ] Local preview works: `npm run docs:preview`

## Cloudflare Pages Setup

- [ ] GitHub repository connected to Cloudflare Pages
- [ ] Build command configured: `npm run docs:build`
- [ ] Build output directory set: `docs-site/.vitepress/dist`
- [ ] Root directory configured (if monorepo)
- [ ] Automatic deployments enabled on `main` branch

## Post-Deployment Verification

- [ ] Production site loads: `https://your-project.pages.dev`
- [ ] English homepage accessible: `/en/`
- [ ] Japanese homepage accessible: `/ja/`
- [ ] Locale switcher works (EN ↔ JA)
- [ ] Search functionality works (both locales)
- [ ] Navigation menus display correctly
- [ ] "Edit this page" links point to correct GitHub paths
- [ ] Images load correctly from `/images/`
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive design verified

## Performance Check

- [ ] Page load time < 2 seconds
- [ ] Lighthouse score > 90 (Performance)
- [ ] No console errors in browser
- [ ] All assets loaded (check Network tab)

## Content Validation

- [ ] All required pages present (see navigation.md contract)
- [ ] Frontmatter correct (title, description, order)
- [ ] Code blocks render with syntax highlighting
- [ ] Tables formatted correctly
- [ ] Callouts/admonitions display properly

## Custom Domain (Optional)

- [ ] Custom domain configured in Cloudflare Pages
- [ ] DNS CNAME record added
- [ ] SSL certificate active (HTTPS)
- [ ] Redirects working (www → non-www or vice versa)

## Monitoring

- [ ] Cloudflare Analytics enabled
- [ ] Error tracking configured (optional)
- [ ] Update notifications set up (GitHub watch)

## Rollback Plan

If deployment fails:

1. Check Cloudflare Pages build logs
2. Verify wrangler.toml configuration
3. Test locally: `npm run docs:build`
4. Revert to last working commit if needed
5. Rebuild and redeploy

## Contact

For deployment issues, check:
- [VitePress Docs](https://vitepress.dev/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GitHub Issues](https://github.com/tar-bin/atrarium/issues)
