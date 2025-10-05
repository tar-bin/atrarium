import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Concept i18n Parity', () => {
  const enPath = join(process.cwd(), 'docs/en/guide/concept.md');
  const jaPath = join(process.cwd(), 'docs/ja/guide/concept.md');

  const extractSections = (content: string): string[] => {
    const sectionRegex = /^## .+$/gm;
    return content.match(sectionRegex) || [];
  };

  const extractDiagrams = (content: string): string[] => {
    const diagramRegex = /```mermaid[\s\S]*?```/g;
    return content.match(diagramRegex) || [];
  };

  it('Japanese concept.md mirrors English structure (section count)', () => {
    const enContent = readFileSync(enPath, 'utf-8');
    const jaContent = readFileSync(jaPath, 'utf-8');

    const enSections = extractSections(enContent);
    const jaSections = extractSections(jaContent);

    expect(enSections.length).toBe(6);
    expect(jaSections.length).toBe(enSections.length);
  });

  it('Japanese concept.md has same number of diagrams as English', () => {
    const enContent = readFileSync(enPath, 'utf-8');
    const jaContent = readFileSync(jaPath, 'utf-8');

    const enDiagrams = extractDiagrams(enContent);
    const jaDiagrams = extractDiagrams(jaContent);

    expect(jaDiagrams.length).toBe(enDiagrams.length);
  });
});
