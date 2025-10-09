# Markdown Library Research (T035)

## Evaluation Criteria
1. **Security**: XSS protection, HTML sanitization
2. **Bundle Size**: Impact on client bundle (gzipped)
3. **API Simplicity**: Ease of use, configuration complexity
4. **Feature Support**: Extended syntax (tables, strikethrough, task lists)
5. **Maintenance**: Active development, community support

## Library Comparison

### 1. marked (https://marked.js.org/)
**Pros**:
- Lightweight: ~31KB minified, ~10KB gzipped
- Simple API: `marked.parse(markdown)` - single function call
- Built-in sanitization via `marked.use({ sanitize: true })`
- Supports extended syntax via extensions
- Active maintenance (15k+ stars, regular updates)
- TypeScript support included

**Cons**:
- Sanitization is deprecated in v4+ (requires DOMPurify)
- Fewer built-in features (tables require extension)

**Bundle Impact**: ★★★★★ (Best)
**API Simplicity**: ★★★★★ (Simplest)
**Security**: ★★★☆☆ (Requires DOMPurify)

### 2. markdown-it (https://markdown-it.github.io/)
**Pros**:
- Rich plugin ecosystem (emoji, tables, footnotes, etc.)
- Configurable parsing modes (strict, commonmark, extended)
- Strong community support (17k+ stars)
- Built-in typographer (smart quotes, em-dashes)
- TypeScript types available (@types/markdown-it)

**Cons**:
- Larger bundle: ~80KB minified, ~25KB gzipped
- More complex API: `new MarkdownIt().render(markdown)`
- No built-in sanitization (requires DOMPurify or markdown-it-sanitizer plugin)
- Steeper learning curve for configuration

**Bundle Impact**: ★★☆☆☆ (Heavy)
**API Simplicity**: ★★★☆☆ (Moderate)
**Security**: ★★★☆☆ (Requires external sanitization)

### 3. remark (https://github.com/remarkjs/remark)
**Pros**:
- Part of unified ecosystem (remark → rehype → HTML)
- Highly extensible via plugins (remark-gfm for tables/strikethrough)
- Built-in AST manipulation for advanced use cases
- Strong TypeScript support
- Active development (7k+ stars)

**Cons**:
- **Largest bundle**: ~150KB+ with required plugins (unified + remark + rehype + plugins)
- **Complex API**: Requires pipeline setup (`unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize).use(rehypeStringify)`)
- Overkill for simple Markdown → HTML conversion
- Requires multiple dependencies (unified, remark-parse, remark-rehype, rehype-stringify, rehype-sanitize)

**Bundle Impact**: ★☆☆☆☆ (Heaviest)
**API Simplicity**: ★★☆☆☆ (Complex)
**Security**: ★★★★☆ (Built-in rehype-sanitize)

## Additional Consideration: DOMPurify
All libraries require **DOMPurify** (https://github.com/cure53/DOMPurify) for robust XSS protection:
- Industry-standard HTML sanitizer
- ~20KB minified, ~7KB gzipped
- Comprehensive XSS protection (blocks `<script>`, `javascript:`, `data:` URIs, etc.)
- Zero-config usage: `DOMPurify.sanitize(html)`

## Decision Matrix

| Library | Bundle Size | API Simplicity | Security | Extended Syntax | Total Score |
|---------|-------------|----------------|----------|-----------------|-------------|
| **marked** | 5/5 (10KB) | 5/5 (Simple) | 3/5 (Needs DOMPurify) | 4/5 (Via extensions) | **17/20** ✅ |
| markdown-it | 3/5 (25KB) | 3/5 (Moderate) | 3/5 (Needs DOMPurify) | 5/5 (Rich plugins) | 14/20 |
| remark | 1/5 (150KB+) | 2/5 (Complex) | 4/5 (Built-in sanitize) | 5/5 (Via plugins) | 12/20 |

## Final Decision: **marked + DOMPurify**

**Rationale**:
1. **Smallest bundle impact**: 10KB (marked) + 7KB (DOMPurify) = **17KB gzipped** (vs 32KB for markdown-it + DOMPurify, 157KB+ for remark stack)
2. **Simplest API**: Single `marked.parse()` call + `DOMPurify.sanitize()` - no pipeline setup
3. **Security**: DOMPurify provides industry-standard XSS protection (same as other options)
4. **Feature completeness**: `marked-gfm` extension adds tables, strikethrough, task lists (GFM spec)
5. **Maintenance**: Active development, TypeScript support, stable v12.x release

**Implementation Plan**:
```typescript
import { marked } from 'marked';
import { gfm } from 'marked-gfm-heading-id'; // GFM extension
import DOMPurify from 'dompurify';

// Configure marked with GFM
marked.use(gfm());

// Parse and sanitize
const html = marked.parse(markdown);
const clean = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'del', 'input'],
  ALLOWED_ATTR: ['type', 'checked', 'disabled'],
});
```

## Dependencies to Install
```bash
pnpm --filter client add marked marked-gfm-heading-id dompurify
pnpm --filter client add -D @types/dompurify
```

## Performance Expectations
- **Parsing**: <10ms for 5000-char post (marked is fastest in benchmarks)
- **Sanitization**: <5ms for typical post (DOMPurify is highly optimized)
- **Total**: <50ms target easily achievable (T058 validation will confirm)

## References
- [marked benchmarks](https://marked.js.org/#/BENCHMARKS.md) - 2-3x faster than markdown-it
- [DOMPurify docs](https://github.com/cure53/DOMPurify#usage) - Security best practices
- [GFM spec](https://github.github.com/gfm/) - Tables, strikethrough, task lists
