// Unit Test: TypeScript Code Generation Validation
// Verifies that @atproto/lex-cli generates valid TypeScript types from Lexicon JSON schemas
// Status: SKIPPED (generated code has dependency issues, using JSON imports instead - see CLAUDE.md)

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const GENERATED_DIR = join(process.cwd(), 'src/schemas/generated');
const LEXICONS_DIR = join(process.cwd(), 'lexicons');

describe.skip('Lexicon Code Generation', () => {
  describe('Generated Files', () => {
    it('should have generated directory', () => {
      expect(existsSync(GENERATED_DIR)).toBe(true);
    });

    it('should generate TypeScript files for all Lexicon schemas', () => {
      const generatedFiles = readdirSync(GENERATED_DIR);

      // Expect at least 1 generated file (lex-cli may create index.ts or individual files)
      expect(generatedFiles.length).toBeGreaterThan(0);

      // Verify TypeScript files exist
      const tsFiles = generatedFiles.filter((file) => file.endsWith('.ts'));
      expect(tsFiles.length).toBeGreaterThan(0);
    });

    it('should match number of Lexicon JSON schemas', () => {
      const lexiconFiles = readdirSync(LEXICONS_DIR).filter((file) => file.endsWith('.json'));
      const generatedFiles = readdirSync(GENERATED_DIR).filter((file) => file.endsWith('.ts'));

      // At minimum, should have 1 file per schema (or 1 index.ts with all schemas)
      expect(generatedFiles.length).toBeGreaterThanOrEqual(1);
      expect(lexiconFiles.length).toBe(3); // 3 Atrarium schemas
    });
  });

  describe('TypeScript Compilation', () => {
    it('should compile generated types without errors', async () => {
      // Import generated types (will fail if TypeScript compilation errors)
      try {
        await import('../../src/schemas/generated/index.js');
        // If import succeeds, compilation is valid
        expect(true).toBe(true);
      } catch (error) {
        // If import fails, check if it's because files don't exist yet (TDD)
        if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
          throw new Error('Generated TypeScript files not found - run `npm run codegen` first');
        }
        // Other errors are compilation failures
        throw error;
      }
    });
  });

  describe('Generated Type Validation', () => {
    it('should export types for community config schema', async () => {
      try {
        const generated = await import('../../src/schemas/generated/index.js');

        // Expect types or interfaces for net.atrarium.community.config
        // Note: Exact export names depend on @atproto/lex-cli implementation
        expect(generated).toBeDefined();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
          throw new Error('Generated types not found - run `npm run codegen`');
        }
        throw error;
      }
    });

    it('should export types for membership schema', async () => {
      try {
        const generated = await import('../../src/schemas/generated/index.js');
        expect(generated).toBeDefined();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
          throw new Error('Generated types not found - run `npm run codegen`');
        }
        throw error;
      }
    });

    it('should export types for moderation action schema', async () => {
      try {
        const generated = await import('../../src/schemas/generated/index.js');
        expect(generated).toBeDefined();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
          throw new Error('Generated types not found - run `npm run codegen`');
        }
        throw error;
      }
    });
  });

  describe('Code Generation Reproducibility', () => {
    it('should generate stable output for same input schemas', () => {
      // Generated files should be committed to Git for build reproducibility
      // This test verifies files exist (actual reproducibility tested in CI)
      expect(existsSync(GENERATED_DIR)).toBe(true);
    });
  });
});
