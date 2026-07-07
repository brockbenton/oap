import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const ALICE = '0x1111111111111111111111111111111111111111';
const BOB = '0x2222222222222222222222222222222222222222';

// Mutable auth state shared with the hoisted Privy mock (vi.hoisted so it exists
// when the mock factory runs).
const authState = vi.hoisted(() => ({
  wallet: '0x1111111111111111111111111111111111111111' as string,
  throwOnGetUser: false,
}));

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: class {
    async getUser() {
      if (authState.throwOnGetUser) throw new Error('invalid token');
      return { id: `did:privy:${authState.wallet}`, wallet: { address: authState.wallet } };
    }
    async getUsers() {
      return [];
    }
  },
}));

// Admin authorization is the on-chain role — mock it so tests don't hit an RPC.
vi.mock('../src/services/onchain.service', () => ({
  hasAdminRoleOnChain: async (wallet: string) =>
    wallet.toLowerCase() === '0x1111111111111111111111111111111111111111',
  tokenBalanceOnChain: async () => 0n,
}));

// Avoid opening a Redis socket when the app imports the check-in route.
vi.mock('../src/lib/queue', () => ({ MINT_QUEUE: 'mint', mintQueue: { add: async () => ({ id: 'test' }) } }));

import { createApp } from '../src/app';

const app = createApp();
type Member = Record<string, unknown>;

beforeEach(() => {
  authState.wallet = ALICE;
  authState.throwOnGetUser = false;
});

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

describe('admin routes are gated by the on-chain role', () => {
  it('401 without a bearer token', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
  });

  it('401 when the token is invalid (Privy verification throws)', async () => {
    authState.throwOnGetUser = true;
    const res = await request(app).get('/api/v1/admin/overview').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });

  it('403 for an authenticated wallet without the on-chain ADMIN_ROLE', async () => {
    authState.wallet = BOB;
    const me = await request(app).get('/api/v1/admin/me').set('Authorization', 'Bearer test');
    expect(me.status).toBe(403);
  });

  it('200 for an on-chain admin on /me and /overview', async () => {
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
