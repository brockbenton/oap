import { describe, it, expect } from 'vitest';
import { buildMeetingNumberMap, buildSessionMetadata } from '../src/services/ipfs.service';

describe('buildMeetingNumberMap', () => {
  it('numbers sessions 1-based within each semester by date ascending', () => {
    const map = buildMeetingNumberMap([
      { sessionIdOnchain: 'b', date: new Date('2026-02-01'), semester: 'Spring 2026' },
      { sessionIdOnchain: 'a', date: new Date('2026-01-01'), semester: 'Spring 2026' },
      { sessionIdOnchain: 'c', date: new Date('2025-09-01'), semester: 'Fall 2025' },
    ]);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
    expect(map.get('c')).toBe(1);
  });
});

describe('buildSessionMetadata', () => {
  it('emits generic per-semester art and the expected attributes', () => {
    const md = buildSessionMetadata(
      { sessionIdOnchain: '3012', name: 'Demo Day', date: new Date('2026-07-01T18:00:00Z'), semester: 'Spring 2026' },
      12,
    );
    expect(md.image.startsWith('ipfs://')).toBe(true);
    expect(md.attributes.find((a) => a.trait_type === 'Meeting #')?.value).toBe(12);
    expect(md.attributes.find((a) => a.trait_type === 'Semester')?.value).toBe('Spring 2026');
    expect(md.attributes.find((a) => a.trait_type === 'Date')?.value).toBe('2026-07-01');
  });

  it('two meetings in the same semester share the same (generic) art CID', () => {
    const a = buildSessionMetadata(
      { sessionIdOnchain: '1', name: 'x', date: new Date('2026-01-01'), semester: 'Spring 2026' },
      1,
    );
    const b = buildSessionMetadata(
      { sessionIdOnchain: '2', name: 'y', date: new Date('2026-02-01'), semester: 'Spring 2026' },
      2,
    );
    expect(a.image).toBe(b.image);
  });
});
