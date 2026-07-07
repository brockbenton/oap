import { describe, it, expect } from 'vitest';
import {
  renderSemesterBadgeSvg,
  renderTierBadgeSvg,
  semesterArtUrl,
  tierBadgeUrl,
  badgeTierFor,
} from '../src/services/art.service';

describe('renderSemesterBadgeSvg', () => {
  it('is deterministic and semester-specific', () => {
    expect(renderSemesterBadgeSvg('Spring 2026')).toBe(renderSemesterBadgeSvg('Spring 2026'));
    expect(renderSemesterBadgeSvg('Spring 2026')).not.toBe(renderSemesterBadgeSvg('Fall 2025'));
  });

  it('escapes XML in the semester label (no SVG injection)', () => {
    const svg = renderSemesterBadgeSvg('<script>&"');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('is an svg document', () => {
    expect(renderSemesterBadgeSvg('X').startsWith('<svg')).toBe(true);
  });
});

describe('tier badges', () => {
  it('badgeTierFor prioritizes founding, then official', () => {
    expect(badgeTierFor('General Member', true)).toBe('founding');
    expect(badgeTierFor('Official Member', false)).toBe('official');
    expect(badgeTierFor('General Member', false)).toBe('general');
  });

  it('renders a labeled badge per tier, falling back to General', () => {
    expect(renderTierBadgeSvg('official')).toContain('Official Member');
    expect(renderTierBadgeSvg('founding')).toContain('Founding Member');
    expect(renderTierBadgeSvg('bogus')).toContain('General Member');
  });
});

describe('asset URLs', () => {
  it('use PUBLIC_API_URL and the expected paths', () => {
    expect(semesterArtUrl('Spring 2026')).toBe('http://localhost:3001/api/v1/art/Spring%202026');
    expect(tierBadgeUrl('official')).toBe('http://localhost:3001/api/v1/badge/official');
  });
});
