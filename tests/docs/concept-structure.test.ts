import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Concept Documentation Structure', () => {
  const conceptPath = join(process.cwd(), 'docs/en/guide/concept.md');

  it('VitePress concept.md has all 6 required sections', () => {
    const content = readFileSync(conceptPath, 'utf-8');

    expect(content).toContain('## Overview');
    expect(content).toContain('## The Problem');
    expect(content).toContain('## The Solution');
    expect(content).toContain('## How It Works');
    expect(content).toContain('## Differentiation');
    expect(content).toContain('## Current Status & Future Vision');
  });

  it('includes Fediverse Observer 2024 data citation', () => {
    const content = readFileSync(conceptPath, 'utf-8');
    expect(content).toMatch(/Fediverse Observer 2024/i);
  });

  it('includes data flow diagram', () => {
    const content = readFileSync(conceptPath, 'utf-8');
    expect(content).toContain('```mermaid');
    expect(content).toMatch(/PDS.*Firehose.*Queue.*Durable Objects.*Feed.*AppView/s);
  });

  it('differentiates from 3 alternatives', () => {
    const content = readFileSync(conceptPath, 'utf-8');
    expect(content).toMatch(/vs.*Fediverse/i);
    expect(content).toMatch(/vs.*Discord/i);
    expect(content).toMatch(/vs.*Bluesky/i);
  });
});
