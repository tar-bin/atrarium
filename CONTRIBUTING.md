# Contributing to Atrarium

Thank you for your interest in contributing to Atrarium! This document provides guidelines for contributing to the project.

## Code Quality Standards

**All contributions MUST comply with [Project Constitution](.specify/memory/constitution.md) v1.1.0**, especially:

### Principle 7: Code Quality and Pre-Commit Validation

Every commit is automatically validated for:
- ✅ **Biome linting** (all `.ts`, `.tsx`, `.js`, `.jsx`, `.json` files)
- ✅ **Biome formatting** (consistent code style)
- ✅ **TypeScript type checking** (no type errors across all workspaces)

**Pre-commit hooks** enforce these checks automatically using Husky + lint-staged. Commits failing validation will be rejected.

## Development Setup

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/atrarium.git
cd atrarium
```

### 2. Install Dependencies

```bash
pnpm install

# Initialize Git hooks (required for pre-commit validation)
pnpm exec husky
```

### 3. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

## Making Changes

### Code Style

- **Linting**: Follow Biome rules (configured in [biome.json](biome.json))
- **Formatting**: Use Biome formatter (2 spaces, single quotes, trailing commas)
- **TypeScript**: Enable strict mode, no implicit any, full type annotations
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/components

### Testing

**All new features MUST include tests:**

```bash
# Run tests before committing
pnpm -r test

# Run tests in watch mode during development
pnpm --filter server test:watch

# Type checking
pnpm -r typecheck
```

**Test Coverage Guidelines**:
- **Contract Tests**: API endpoint validation
- **Integration Tests**: End-to-end workflows
- **Unit Tests**: Isolated logic validation

### Manual Quality Checks

While pre-commit hooks automate most checks, you can run them manually:

```bash
# Lint and auto-fix
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm -r typecheck
```

## Commit Guidelines

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change)
- `test`: Test additions or updates
- `chore`: Build process or auxiliary tool changes

**Examples**:
```
feat(feed-generator): add support for custom feed mixing
fix(auth): resolve JWT expiration validation issue
docs(setup): update pre-commit hooks installation guide
test(moderation): add integration test for hide post flow
```

### Pre-commit Validation

Every commit triggers automatic validation:

```bash
git commit -m "feat: add new feature"

# Automatic checks:
# 1. Biome linting on staged files
# 2. TypeScript type checking (all workspaces)
```

**If validation fails**:
1. Fix linting issues: `pnpm lint:fix`
2. Fix type errors: Check output from `pnpm -r typecheck`
3. Stage fixes: `git add .`
4. Retry commit: `git commit -m "feat: add new feature"`

## Pull Request Process

### 1. Ensure Quality

Before submitting a PR:

```bash
# Run all tests
pnpm -r test

# Verify type checking
pnpm -r typecheck

# Verify linting
pnpm lint
```

### 2. Create Pull Request

- **Title**: Use conventional commit format (e.g., `feat: add custom feed mixing`)
- **Description**: Explain changes, rationale, and impact
- **Constitution Check**: Verify compliance with [7 principles](.specify/memory/constitution.md)
- **Screenshots**: Include for UI changes

### 3. PR Checklist

- [ ] All tests pass (`pnpm -r test`)
- [ ] Type checking passes (`pnpm -r typecheck`)
- [ ] Biome linting passes (`pnpm lint`)
- [ ] New features include tests
- [ ] Documentation updated (if applicable)
- [ ] Constitution compliance verified
- [ ] Commit messages follow conventional commits

### 4. Review Process

- Maintainers will review your PR within 7 days
- Address feedback in new commits (do not force-push)
- Once approved, maintainers will merge using squash merge

## Architecture Guidelines

### Protocol-First Design

**Principle 1**: Lexicon schemas are the API contract, implementations are replaceable.

- All community data structures MUST be defined in AT Protocol Lexicon schemas (`lexicons/*.json`)
- No proprietary data formats or vendor-specific APIs
- Infrastructure choices (Cloudflare Workers) MUST NOT create lock-in

### PDS-First Architecture

**Principle 5**: PDS as source of truth, Durable Objects as 7-day cache.

- All writes MUST go to PDS first
- Durable Objects MUST serve as read-optimized cache only
- System MUST be rebuildable from PDS + Firehose

### Simplicity

**Principle 2**: No new projects/databases/services without necessity.

- Prefer extending existing components over creating new ones
- Reuse established tech stack (Hono, React 19, TanStack)
- Avoid framework proliferation

See [Project Constitution](.specify/memory/constitution.md) for complete principles.

## Lexicon Schema Changes

Changes to AT Protocol Lexicon schemas require extra scrutiny:

1. **Propose changes** in GitHub Issue first
2. **Backward compatibility** - avoid breaking changes
3. **Documentation** - update [lexicons/README.md](lexicons/README.md)
4. **Code generation** - run `pnpm --filter server codegen`
5. **Tests** - update affected contract/integration tests

## Development Workflow

### Feature Development

For complex features, use `.specify/` slash commands (in Claude Code):

```bash
/specify      # Create spec.md from feature description
/plan         # Generate plan.md with implementation design
/tasks        # Generate tasks.md with dependency-ordered tasks
/implement    # Execute tasks.md automatically
```

### Testing with Local PDS

For PDS integration testing:

```bash
# Open project in DevContainer (VS Code)
# Local PDS available at http://localhost:3000

# Run PDS integration tests
pnpm --filter server test:pds
```

## Documentation

### What to Document

- **New features**: Update relevant README files
- **API changes**: Update component documentation
- **Breaking changes**: Highlight in PR description
- **Setup changes**: Update [SETUP.md](SETUP.md)

### Documentation Style

- **Language**: English for all documentation (code, comments, docs)
- **Format**: Markdown with GitHub-flavored syntax
- **Code examples**: Include working examples with output
- **Links**: Use relative paths for internal links

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue with reproduction steps
- **Security**: Email maintainers (do not open public issues)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on technical merit
- No harassment or discrimination

## License

By contributing, you agree your contributions will be licensed under the same MIT License as the project.

---

**Thank you for contributing to Atrarium!** 🎉
