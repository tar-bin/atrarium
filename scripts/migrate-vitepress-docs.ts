#!/usr/bin/env tsx
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

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
    sources: ['docs/architecture/system-design.md', 'docs/architecture/database.md'],
    destination: 'server/ARCHITECTURE.md',
    strategy: 'merge',
  },
  {
    sources: ['docs/architecture/api.md', 'docs/reference/api-reference.md'],
    destination: 'server/API.md',
    strategy: 'merge',
  },
  {
    sources: ['docs/reference/development-spec.md', 'docs/reference/implementation.md'],
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
  transformed = transformed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<!-- Image removed: $2 -->');

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
  transformed = transformed.replace(/https:\/\/docs\.atrarium\.net/g, '/CONCEPT.md');

  // Update internal doc links to absolute repo paths
  transformed = transformed.replace(/docs\/architecture\/api\.md/g, '/server/API.md');
  transformed = transformed.replace(/docs\/architecture\/database\.md/g, '/server/ARCHITECTURE.md');
  transformed = transformed.replace(
    /docs\/architecture\/system-design\.md/g,
    '/server/ARCHITECTURE.md'
  );
  transformed = transformed.replace(/docs\/reference\/api-reference\.md/g, '/server/API.md');
  transformed = transformed.replace(/docs\/guide\/concept\.md/g, '/CONCEPT.md');
  transformed = transformed.replace(/docs\/guide\/quickstart\.md/g, '/QUICKSTART.md');
  transformed = transformed.replace(/docs\/guide\/setup\.md/g, '/SETUP.md');

  return transformed;
}

async function migrateFile(sourcePath: string, destPath: string): Promise<void> {
  const fullSourcePath = path.join(REPO_ROOT, sourcePath);
  const fullDestPath = path.join(REPO_ROOT, destPath);
  // Read source content
  const content = await fs.readFile(fullSourcePath, 'utf-8');

  // Transform content
  const transformed = await transformContent(content);

  // Ensure destination directory exists
  await fs.mkdir(path.dirname(fullDestPath), { recursive: true });

  // Write to destination
  await fs.writeFile(fullDestPath, transformed, 'utf-8');
}

async function consolidateFiles(rule: ConsolidationRule): Promise<void> {
  if (rule.strategy === 'delete') {
    return;
  }

  if (rule.strategy === 'merge' && rule.destination) {
    const destination = rule.destination; // Type guard: destination is now string

    // Read all source files
    const contents = await Promise.all(
      rule.sources.map(async (src) => {
        const fullPath = path.join(REPO_ROOT, src);
        return await fs.readFile(fullPath, 'utf-8');
      })
    );

    // Simple merge: concatenate with separators
    // TODO: Implement intelligent section merging as per consolidation-strategy.md
    let merged = `# ${path.basename(destination, '.md')}\n\n`;
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
    const fullDestPath = path.join(REPO_ROOT, destination);
    await fs.mkdir(path.dirname(fullDestPath), { recursive: true });
    await fs.writeFile(fullDestPath, transformed, 'utf-8');
  }
}

async function updateWorkspaceConfig(): Promise<void> {
  const workspaceFile = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
  let content = await fs.readFile(workspaceFile, 'utf-8');

  // Remove 'docs' line
  content = content.replace(/\n {2}- 'docs'\n/, '\n');

  await fs.writeFile(workspaceFile, content, 'utf-8');
}

async function updatePackageJson(): Promise<void> {
  const packageFile = path.join(REPO_ROOT, 'package.json');
  const content = await fs.readFile(packageFile, 'utf-8');
  const pkg = JSON.parse(content);

  // Remove test:docs script
  delete pkg.scripts['test:docs'];

  await fs.writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
}

async function updateReferences(): Promise<void> {
  const readmeFile = path.join(REPO_ROOT, 'README.md');
  let content = await fs.readFile(readmeFile, 'utf-8');

  // Replace VitePress documentation links
  const oldPattern =
    /📖 \*\*\[Documentation\]\(https:\/\/docs\.atrarium\.net\)\*\* \| \[日本語\]\(https:\/\/docs\.atrarium\.net\/ja\/\)/;
  const newText = `📖 **Documentation**: Component-specific docs are located in respective directories:
- [Lexicons](/lexicons/README.md) - AT Protocol Lexicon schemas
- [Server](/server/README.md) - Backend server documentation
- [Client](/client/README.md) - Web dashboard documentation
- [Project Concept](/CONCEPT.md) - System design and architecture`;

  content = content.replace(oldPattern, newText);

  await fs.writeFile(readmeFile, content, 'utf-8');
}

async function deleteDocsWorkspace(force: boolean): Promise<void> {
  if (!force) {
    return;
  }

  await fs.rm(DOCS_PATH, { recursive: true, force: true });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  if (dryRun) {
    for (const rule of CONSOLIDATION_RULES) {
      if (rule.strategy === 'merge') {
        // Dry-run: would merge files
      } else {
        // Dry-run: would delete files
      }
    }
    for (const [_source, _dest] of Object.entries(FILE_MAPPING)) {
      // Dry-run: would migrate file
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
  } catch (_error) {
    process.exit(1);
  }
}

main().catch((_error) => {
  process.exit(1);
});
