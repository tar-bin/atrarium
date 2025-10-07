#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_PATH = path.join(REPO_ROOT, 'docs');

// Consolidation rules (from consolidation-strategy.md)
interface ConsolidationRule {
  sources: string[];
  destination: string | null;
  strategy: 'merge' | 'delete';
}

const CONSOLIDATION_RULES: ConsolidationRule[] = [
  {
    sources: [
      'docs/architecture/system-design.md',
      'docs/architecture/database.md',
    ],
    destination: 'server/ARCHITECTURE.md',
    strategy: 'merge',
  },
  {
    sources: ['docs/architecture/api.md', 'docs/reference/api-reference.md'],
    destination: 'server/API.md',
    strategy: 'merge',
  },
  {
    sources: [
      'docs/reference/development-spec.md',
      'docs/reference/implementation.md',
    ],
    destination: null,
    strategy: 'delete',
  },
];

// File mapping for non-consolidated files (from consolidation-strategy.md)
const FILE_MAPPING: Record<string, string> = {
  'docs/reference/moderation-reasons.md': 'server/MODERATION_REASONS.md',
  'docs/guide/concept.md': 'CONCEPT.md',
  'docs/guide/quickstart.md': 'QUICKSTART.md',
  'docs/guide/setup.md': 'SETUP.md',
  'docs/CONTRIBUTING.md': 'CONTRIBUTING.md',
  'docs/DEPLOYMENT.md': 'server/DEPLOYMENT.md',
};

async function transformContent(content: string): Promise<string> {
  let transformed = content;

  // Remove image references
  transformed = transformed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<!-- Image removed: $2 -->'
  );

  // Update VitePress URLs to component paths
  transformed = transformed.replace(
    /https:\/\/docs\.atrarium\.net\/en\/guide\/concept\.html/g,
    '/CONCEPT.md'
  );
  transformed = transformed.replace(
    /https:\/\/docs\.atrarium\.net\/en\/guide\/quickstart\.html/g,
    '/QUICKSTART.md'
  );
  transformed = transformed.replace(
    /https:\/\/docs\.atrarium\.net\/en\/guide\/setup\.html/g,
    '/SETUP.md'
  );
  transformed = transformed.replace(
    /https:\/\/docs\.atrarium\.net/g,
    '/CONCEPT.md'
  );

  // Update internal doc links to absolute repo paths
  transformed = transformed.replace(
    /docs\/architecture\/api\.md/g,
    '/server/API.md'
  );
  transformed = transformed.replace(
    /docs\/architecture\/database\.md/g,
    '/server/ARCHITECTURE.md'
  );
  transformed = transformed.replace(
    /docs\/architecture\/system-design\.md/g,
    '/server/ARCHITECTURE.md'
  );
  transformed = transformed.replace(
    /docs\/reference\/api-reference\.md/g,
    '/server/API.md'
  );
  transformed = transformed.replace(
    /docs\/guide\/concept\.md/g,
    '/CONCEPT.md'
  );
  transformed = transformed.replace(/docs\/guide\/quickstart\.md/g, '/QUICKSTART.md');
  transformed = transformed.replace(/docs\/guide\/setup\.md/g, '/SETUP.md');

  return transformed;
}

async function migrateFile(
  sourcePath: string,
  destPath: string
): Promise<void> {
  const fullSourcePath = path.join(REPO_ROOT, sourcePath);
  const fullDestPath = path.join(REPO_ROOT, destPath);

  console.log(`[INFO] Migrating: ${sourcePath} -> ${destPath}`);

  try {
    // Read source content
    const content = await fs.readFile(fullSourcePath, 'utf-8');

    // Transform content
    const transformed = await transformContent(content);

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(fullDestPath), { recursive: true });

    // Write to destination
    await fs.writeFile(fullDestPath, transformed, 'utf-8');
    console.log(`[SUCCESS] Written: ${destPath}`);
  } catch (error) {
    console.error(`[ERROR] Failed to migrate ${sourcePath}:`, error);
    throw error;
  }
}

async function consolidateFiles(rule: ConsolidationRule): Promise<void> {
  if (rule.strategy === 'delete') {
    console.log(
      `[INFO] Skipping outdated files (will be deleted): ${rule.sources.join(', ')}`
    );
    return;
  }

  if (rule.strategy === 'merge' && rule.destination) {
    console.log(
      `[INFO] Consolidating ${rule.sources.length} files -> ${rule.destination}`
    );

    // Read all source files
    const contents = await Promise.all(
      rule.sources.map(async (src) => {
        const fullPath = path.join(REPO_ROOT, src);
        return await fs.readFile(fullPath, 'utf-8');
      })
    );

    // Simple merge: concatenate with separators
    // TODO: Implement intelligent section merging as per consolidation-strategy.md
    let merged = `# ${path.basename(rule.destination!, '.md')}\n\n`;
    merged += `**Consolidated from**: ${rule.sources.join(', ')}\n\n`;
    merged += '---\n\n';

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      const source = rule.sources[i];

      // Remove first heading if it's the file title
      const withoutFirstHeading = content.replace(/^#\s+.+\n\n?/, '');

      merged += `## From: ${path.basename(source)}\n\n`;
      merged += withoutFirstHeading;
      merged += '\n\n---\n\n';
    }

    // Transform links in merged content
    const transformed = await transformContent(merged);

    // Write consolidated file
    const fullDestPath = path.join(REPO_ROOT, rule.destination!);
    await fs.mkdir(path.dirname(fullDestPath), { recursive: true });
    await fs.writeFile(fullDestPath, transformed, 'utf-8');

    console.log(`[SUCCESS] Consolidated: ${rule.destination}`);
  }
}

async function updateWorkspaceConfig(): Promise<void> {
  console.log('[INFO] Updating pnpm-workspace.yaml...');

  const workspaceFile = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
  let content = await fs.readFile(workspaceFile, 'utf-8');

  // Remove 'docs' line
  content = content.replace(/\n  - 'docs'\n/, '\n');

  await fs.writeFile(workspaceFile, content, 'utf-8');
  console.log('[SUCCESS] Updated pnpm-workspace.yaml');
}

async function updatePackageJson(): Promise<void> {
  console.log('[INFO] Updating package.json...');

  const packageFile = path.join(REPO_ROOT, 'package.json');
  const content = await fs.readFile(packageFile, 'utf-8');
  const pkg = JSON.parse(content);

  // Remove test:docs script
  delete pkg.scripts['test:docs'];

  await fs.writeFile(packageFile, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log('[SUCCESS] Updated package.json');
}

async function updateReferences(): Promise<void> {
  console.log('[INFO] Updating README.md...');

  const readmeFile = path.join(REPO_ROOT, 'README.md');
  let content = await fs.readFile(readmeFile, 'utf-8');

  // Replace VitePress documentation links
  const oldPattern = /📖 \*\*\[Documentation\]\(https:\/\/docs\.atrarium\.net\)\*\* \| \[日本語\]\(https:\/\/docs\.atrarium\.net\/ja\/\)/;
  const newText = `📖 **Documentation**: Component-specific docs are located in respective directories:
- [Lexicons](/lexicons/README.md) - AT Protocol Lexicon schemas
- [Server](/server/README.md) - Backend server documentation
- [Client](/client/README.md) - Web dashboard documentation
- [Project Concept](/CONCEPT.md) - System design and architecture`;

  content = content.replace(oldPattern, newText);

  await fs.writeFile(readmeFile, content, 'utf-8');
  console.log('[SUCCESS] Updated README.md');
}

async function deleteDocsWorkspace(force: boolean): Promise<void> {
  if (!force) {
    console.log(
      '[WARN] Skipping docs/ deletion (use --force to delete)'
    );
    return;
  }

  console.log('[WARN] Deleting docs/ workspace...');

  await fs.rm(DOCS_PATH, { recursive: true, force: true });
  console.log('[SUCCESS] Deleted docs/ workspace');
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  console.log('[INFO] Starting VitePress documentation migration...');
  console.log(`[INFO] Mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'}`);

  if (dryRun) {
    console.log('[INFO] Dry-run mode: No files will be modified');
    console.log('[INFO] Consolidation rules:');
    for (const rule of CONSOLIDATION_RULES) {
      if (rule.strategy === 'merge') {
        console.log(`  ${rule.sources.join(' + ')} -> ${rule.destination}`);
      } else {
        console.log(`  DELETE: ${rule.sources.join(', ')}`);
      }
    }
    console.log('[INFO] File mapping:');
    for (const [source, dest] of Object.entries(FILE_MAPPING)) {
      console.log(`  ${source} -> ${dest}`);
    }
    return;
  }

  try {
    // Step 1: Consolidate files
    for (const rule of CONSOLIDATION_RULES) {
      await consolidateFiles(rule);
    }

    // Step 2: Migrate non-consolidated files
    for (const [source, dest] of Object.entries(FILE_MAPPING)) {
      await migrateFile(source, dest);
    }

    // Step 3: Update workspace config
    await updateWorkspaceConfig();
    await updatePackageJson();

    // Step 4: Update references
    await updateReferences();

    // Step 5: Delete docs workspace (requires force flag)
    await deleteDocsWorkspace(force);

    console.log('[SUCCESS] Migration completed!');
    console.log('[INFO] Next steps:');
    console.log('  1. Run: pnpm install');
    console.log('  2. Verify: git status');
    console.log('  3. Test: pnpm run build');
  } catch (error) {
    console.error('[ERROR] Migration failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[ERROR] Migration failed:', error);
  process.exit(1);
});
