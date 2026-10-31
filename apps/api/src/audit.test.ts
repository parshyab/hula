import { describe, expect, it } from 'vitest';
import { _test, GENESIS_HASH } from './audit';

const { canonical, computeHash } = _test;

describe('audit hash chain', () => {
  it('canonicalizes objects key-order independently', () => {
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  });

  it('is deterministic for the same payload + prevHash', () => {
    const payload = { action: 'employee.read', actorId: 'u1' };
    expect(computeHash(GENESIS_HASH, payload)).toBe(computeHash(GENESIS_HASH, payload));
  });

  it('changes when any field is tampered', () => {
    const base = computeHash(GENESIS_HASH, { action: 'employee.read', actorId: 'u1' });
    const tampered = computeHash(GENESIS_HASH, { action: 'employee.read', actorId: 'u2' });
    expect(base).not.toBe(tampered);
  });

  it('changes when the previous link changes (chaining)', () => {
    const payload = { action: 'x' };
    expect(computeHash(GENESIS_HASH, payload)).not.toBe(computeHash('deadbeef', payload));
  });
});
