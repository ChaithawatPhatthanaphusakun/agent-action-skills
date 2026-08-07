import { createRequire } from 'module';
import { describe, expect, it } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Import the CommonJS module from bin/resolveFixMode.js
const resolveFixMode = require(
  path.resolve(__dirname, '../../../bin/resolveFixMode.js'),
);

describe('resolveFixMode', () => {
  it('routes a bare address to address mode', () => {
    const result = resolveFixMode(['addr']);
    expect(result.mode).toBe('address');
    expect(result.address).toBe('addr');
  });

  it('routes a bare date to fields mode', () => {
    const result = resolveFixMode(['18/05/2026']);
    expect(result.mode).toBe('fields');
    expect(result.firstArg).toBe('18/05/2026');
    expect(result.extraFlags).toEqual([]);
  });

  it('routes --due with a date to fields mode', () => {
    const result = resolveFixMode(['--due', '18/05/2026']);
    expect(result.mode).toBe('fields');
    expect(result.firstArg).toBe('--due');
    expect(result.extraFlags).toEqual(['18/05/2026']);
  });

  it('routes a positional address plus a field flag to combined mode (regression: never drops the address)', () => {
    const result = resolveFixMode(['addr', '--due', '18/05/2026']);
    expect(result.mode).toBe('combined');
    expect(result.address).toBe('addr');
    expect(result.date).toBeUndefined();
    expect(result.flagArgs).toEqual(['--due', '18/05/2026']);
  });

  it('routes a positional address plus a date to combined mode', () => {
    const result = resolveFixMode(['addr', '18/05/2026']);
    expect(result.mode).toBe('combined');
    expect(result.address).toBe('addr');
    expect(result.date).toBe('18/05/2026');
    expect(result.flagArgs).toEqual([]);
  });

  it('routes a positional address, date, and flags to combined mode, preserving all tokens', () => {
    const result = resolveFixMode(['addr', '18/05/2026', '--title', 'X']);
    expect(result.mode).toBe('combined');
    expect(result.address).toBe('addr');
    expect(result.date).toBe('18/05/2026');
    expect(result.flagArgs).toEqual(['--title', 'X']);
  });

  it('returns error mode when multiple unquoted words appear before flags', () => {
    const result = resolveFixMode(['one', 'two', '--due', 'x']);
    expect(result.mode).toBe('error');
    expect(result.message).toBeDefined();
  });

  it('returns error mode when multiple unquoted words appear with no flags', () => {
    const result = resolveFixMode(['one', 'two']);
    expect(result.mode).toBe('error');
    expect(result.message).toBeDefined();
  });

  it('routes --invoice alone to fields mode', () => {
    const result = resolveFixMode(['--invoice', 'INV-123']);
    expect(result.mode).toBe('fields');
    expect(result.firstArg).toBe('--invoice');
    expect(result.extraFlags).toEqual(['INV-123']);
  });

  it('routes --title alone to fields mode', () => {
    const result = resolveFixMode(['--title', 'My Invoice']);
    expect(result.mode).toBe('fields');
    expect(result.firstArg).toBe('--title');
    expect(result.extraFlags).toEqual(['My Invoice']);
  });

  it('routes --logo alone to fields mode', () => {
    const result = resolveFixMode(['--logo', '/path/to/logo.png']);
    expect(result.mode).toBe('fields');
    expect(result.firstArg).toBe('--logo');
    expect(result.extraFlags).toEqual(['/path/to/logo.png']);
  });

  it('routes --line alone to fields mode', () => {
    const result = resolveFixMode(['--line', 'item detail']);
    expect(result.mode).toBe('fields');
    expect(result.firstArg).toBe('--line');
    expect(result.extraFlags).toEqual(['item detail']);
  });
});
