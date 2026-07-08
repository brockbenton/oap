import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const ALICE = '0x1111111111111111111111111111111111111111';
// Not in the seed set — exercises the "profile before first check-in" upsert path.
const CAROL = '0x3333333333333333333333333333333333333333';

const authState = vi.hoisted(() => ({
  wallet: '0x1111111111111111111111111111111111111111' as string,
}));

vi.mock('@privy-io/server-auth', () => ({
  PrivyClient: class {
    async getUser() {
      return { id: `did:privy:${authState.wallet}`, wallet: { address: authState.wallet } };
    }
    async getUsers() {
      return [];
    }
  },
}));

vi.mock('../src/services/onchain.service', () => ({
  hasAdminRoleOnChain: async () => false,
  tokenBalanceOnChain: async () => 0n,
}));

vi.mock('../src/lib/queue', () => ({ MINT_QUEUE: 'mint', mintQueue: { add: async () => ({ id: 'test' }) } }));

import { createApp } from '../src/app';

const app = createApp();

beforeEach(() => {
  authState.wallet = ALICE;
});

describe('GET /api/v1/members/me', () => {
  it('401 without a bearer token', async () => {
    const res = await request(app).get('/api/v1/members/me');
    expect(res.status).toBe(401);
  });

  it('returns a default profile (nulls) for a member with no profile set', async () => {
    const res = await request(app).get('/api/v1/members/me').set('Authorization', 'Bearer test');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      walletAddress: ALICE,
      username: null,
      avatarColor: null,
      bio: null,
      notifyEmail: false,
    });
  });
});

describe('PATCH /api/v1/members/me', () => {
  it('upserts a profile for a brand-new wallet (no member row yet)', async () => {
    authState.wallet = CAROL;
    const res = await request(app)
      .patch('/api/v1/members/me')
      .set('Authorization', 'Bearer test')
      .send({ username: 'satoshi', avatarColor: 2, bio: 'gm', notifyEmail: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      walletAddress: CAROL,
      username: 'satoshi',
      avatarColor: 2,
      bio: 'gm',
      notifyEmail: true,
    });

    const get = await request(app).get('/api/v1/members/me').set('Authorization', 'Bearer test');
    expect(get.body.data.username).toBe('satoshi');
  });

  it('409 when the username is already taken by another member', async () => {
    authState.wallet = ALICE;
    const res = await request(app)
      .patch('/api/v1/members/me')
      .set('Authorization', 'Bearer test')
      .send({ username: 'satoshi' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('lowercases the username (case-insensitive uniqueness) and accepts a free one', async () => {
    authState.wallet = ALICE;
    const res = await request(app)
      .patch('/api/v1/members/me')
      .set('Authorization', 'Bearer test')
      .send({ username: 'VitaliK' });
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('vitalik');
  });

  it('400 on an invalid username (too short after lowercasing)', async () => {
    authState.wallet = ALICE;
    const res = await request(app)
      .patch('/api/v1/members/me')
      .set('Authorization', 'Bearer test')
      .send({ username: 'AB' });
    expect(res.status).toBe(400);
  });

  it('400 on an out-of-range avatarColor', async () => {
    authState.wallet = ALICE;
    const res = await request(app)
      .patch('/api/v1/members/me')
      .set('Authorization', 'Bearer test')
      .send({ avatarColor: 99 });
    expect(res.status).toBe(400);
  });
});
