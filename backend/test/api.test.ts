import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock Privy so authMiddleware resolves the bearer token to the seeded admin wallet.
vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: class {
    async getUser() {
      return { id: 'did:privy:alice', wallet: { address: '0x1111111111111111111111111111111111111111' } };
    }
    async getUsers() {
      return [];
    }
  },
}));

import { createApp } from '../src/app';

const app = createApp();
const ALICE = '0x1111111111111111111111111111111111111111';
type Member = Record<string, unknown>;

describe('GET /api/v1/members (public)', () => {
  it('returns the roster with no PII (no linkedAccount, no id, no email)', async () => {
    const res = await request(app).get('/api/v1/members');
    expect(res.status).toBe(200);
    const members = res.body.data.members as Member[];
    expect(members).toHaveLength(6);
    expect(members.every((m) => !('linkedAccount' in m))).toBe(true);
    expect(members.every((m) => !('id' in m))).toBe(true);
    expect(JSON.stringify(members).includes('@')).toBe(false);
  });
});

describe('GET /api/v1/members/:address/{tokens,stats} (public)', () => {
  it('returns the vault for a known member', async () => {
    const res = await request(app).get(`/api/v1/members/${ALICE}/tokens`);
    expect(res.status).toBe(200);
    expect(res.body.data.tokenCount).toBe(16);
  });

  it('returns personal stats for a known member', async () => {
    const res = await request(app).get(`/api/v1/members/${ALICE}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.data.allTimeAttendancePct).toBe(100);
  });

  it('rejects an invalid address with 400', async () => {
    const res = await request(app).get('/api/v1/members/not-an-address/stats');
    expect(res.status).toBe(400);
  });
});

describe('admin routes are gated', () => {
  it('401 without a bearer token', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
  });

  it('200 for an admin (mocked Privy) on /me and /overview', async () => {
    const me = await request(app).get('/api/v1/admin/me').set('Authorization', 'Bearer test');
    expect(me.status).toBe(200);
    expect(me.body.data.isAdmin).toBe(true);

    const overview = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', 'Bearer test');
    expect(overview.status).toBe(200);
    expect(overview.body.data.totalSessions).toBe(16);
    expect(overview.body.data.series).toHaveLength(16);
  });
});
