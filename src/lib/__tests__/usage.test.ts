import { describe, expect, it } from 'vitest';
import { parseUsageReport } from '../usage-report';

const now = new Date('2026-11-23T12:00:00Z');
const ok = {
  device: '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b',
  kind: 'ipad',
  installed: true,
  version: '2026-11-23',
  days: [{ day: '2026-11-22', taps: 40, sentences: 6, sends: 1 }],
};

describe('usage report', () => {
  it('accepts a normal report', () => {
    expect(parseUsageReport(ok, now)).toEqual(ok);
  });

  it('keeps only counts: anything else in the report is dropped', () => {
    const r = parseUsageReport({ ...ok, words: ['su', 'istiyorum'], days: [{ ...ok.days[0], sentence: 'Su istiyorum' }] }, now)!;
    expect(JSON.stringify(r)).not.toContain('istiyorum');
  });

  it('refuses bad or odd reports', () => {
    expect(parseUsageReport(null, now)).toBeNull();
    expect(parseUsageReport({ ...ok, device: 'x' }, now)).toBeNull();
    expect(parseUsageReport({ ...ok, days: [] }, now)).toBeNull();
    expect(parseUsageReport({ ...ok, days: [{ ...ok.days[0], taps: -1 }] }, now)).toBeNull();
    expect(parseUsageReport({ ...ok, days: [{ ...ok.days[0], taps: 1.5 }] }, now)).toBeNull();
    expect(parseUsageReport({ ...ok, days: [{ ...ok.days[0], day: '2027-05-01' }] }, now)).toBeNull();
    expect(parseUsageReport({ ...ok, days: [{ ...ok.days[0], day: '22.11.2026' }] }, now)).toBeNull();
  });

  it('treats an unknown device kind as other', () => {
    expect(parseUsageReport({ ...ok, kind: 'toaster' }, now)!.kind).toBe('other');
  });
});
