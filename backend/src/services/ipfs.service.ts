import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

/**
 * Metadata / IPFS pipeline. Per resolved Open Question #2, token art is one
 * generic image per SEMESTER (not per meeting), so each session's metadata
 * points at its semester's art CID. JSONs are pinned under a directory whose CID
 * becomes the contract baseCid, making uri(id) → ipfs://{baseCid}/{id}.json resolve.
 */
const IPFS_GATEWAY = (process.env.IPFS_GATEWAY ?? 'https://ipfs.io/ipfs/').replace(/\/?$/, '/');
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

// Fallback art CID used when a semester has no explicit mapping configured.
const DEFAULT_ART_CID =
  process.env.DEFAULT_SEMESTER_ART_CID ?? 'bafybeic0clubart0000000000000000000000000000000000000000000000';

// Staging directory for generated metadata before/without pinning (dry-run).
const STAGING_DIR = path.join(process.cwd(), 'ipfs-staging');

const METADATA_NAME_PREFIX = 'Blockchain Club';
const TRAIT_DATE = 'Date';
const TRAIT_SEMESTER = 'Semester';
const TRAIT_MEETING = 'Meeting #';

export interface TokenAttribute {
  trait_type: string;
  value: string | number;
}

export interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  attributes: TokenAttribute[];
}

interface SessionArtInput {
  sessionIdOnchain: string;
  name: string;
  date: Date;
  semester: string;
}

/**
 * Optional per-semester art overrides, supplied as a JSON object in
 * SEMESTER_ART_CIDS, e.g. {"Spring 2026":"bafy...","Fall 2025":"bafy..."}.
 */
function semesterArtOverrides(): Record<string, string> {
  const raw = process.env.SEMESTER_ART_CIDS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch (err) {
    logger.warn({ msg: 'Invalid SEMESTER_ART_CIDS JSON — ignoring', err: (err as Error).message });
  }
  return {};
}

export function resolveSemesterArtCid(semester: string): string {
  return semesterArtOverrides()[semester] ?? DEFAULT_ART_CID;
}

/** Gateway URL for a semester's generic art — used by the vault UI. */
export function tokenImageUrl(semester: string): string {
  return `${IPFS_GATEWAY}${resolveSemesterArtCid(semester)}`;
}

/** ipfs:// URI the contract will serve for a token, if a base CID is configured. */
export function tokenMetadataUri(sessionIdOnchain: string): string | null {
  const baseCid = process.env.CONTRACT_BASE_CID;
  return baseCid ? `ipfs://${baseCid}/${sessionIdOnchain}.json` : null;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Assigns each session its 1-based ordinal WITHIN its semester (by date asc).
 * Shared by the metadata pipeline and the vault view so a token's "Meeting #"
 * is stable across both.
 */
export function buildMeetingNumberMap(
  sessions: { sessionIdOnchain: string; date: Date; semester: string }[],
): Map<string, number> {
  const bySemester = new Map<string, { sessionIdOnchain: string; date: Date }[]>();
  for (const s of sessions) {
    const list = bySemester.get(s.semester) ?? [];
    list.push({ sessionIdOnchain: s.sessionIdOnchain, date: s.date });
    bySemester.set(s.semester, list);
  }
  const result = new Map<string, number>();
  for (const list of bySemester.values()) {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    list.forEach((s, i) => result.set(s.sessionIdOnchain, i + 1));
  }
  return result;
}

export function buildSessionMetadata(session: SessionArtInput, meetingNumber: number): TokenMetadata {
  const longDate = formatLongDate(session.date);
  return {
    name: `${METADATA_NAME_PREFIX} — ${longDate}`,
    description: `Attendance token for "${session.name}" on ${longDate}.`,
    image: `ipfs://${resolveSemesterArtCid(session.semester)}`,
    attributes: [
      { trait_type: TRAIT_DATE, value: formatIsoDate(session.date) },
      { trait_type: TRAIT_SEMESTER, value: session.semester },
      { trait_type: TRAIT_MEETING, value: meetingNumber },
    ],
  };
}

/**
 * Pins a JSON object to IPFS via Pinata when PINATA_JWT is configured.
 * Without a key this is a no-op (dry-run) returning null — the caller still
 * stages the JSON to disk so the pipeline is verifiable offline.
 */
async function pinJsonToIpfs(name: string, content: TokenMetadata): Promise<string | null> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return null;

  const res = await fetch(PINATA_PIN_JSON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ pinataMetadata: { name }, pinataContent: content }),
  });
  if (!res.ok) {
    throw new Error(`Pinata pin failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { IpfsHash?: string };
  if (!body.IpfsHash) throw new Error('Pinata response missing IpfsHash');
  return body.IpfsHash;
}

export interface PublishItem {
  sessionIdOnchain: string;
  semester: string;
  meetingNumber: number;
  cid: string | null;
  stagedPath: string;
}

export interface PublishResult {
  staged: number;
  pinned: number;
  dryRun: boolean;
  stagingDir: string;
  items: PublishItem[];
}

/**
 * Generates ERC-1155 metadata for every confirmed session, stages each JSON to
 * disk, and (when Pinata is configured) pins it to IPFS. Idempotent: re-running
 * regenerates the staging directory.
 */
export async function publishSemesterMetadata(): Promise<PublishResult> {
  const sessions = await prisma.session.findMany({
    where: { onchainStatus: 'CONFIRMED' },
    select: { sessionIdOnchain: true, name: true, date: true, semester: true },
    orderBy: { date: 'asc' },
  });

  const meetingNumbers = buildMeetingNumberMap(sessions);
  const dryRun = !process.env.PINATA_JWT;

  await fs.mkdir(STAGING_DIR, { recursive: true });

  const items: PublishItem[] = [];
  let pinned = 0;

  for (const s of sessions) {
    const meetingNumber = meetingNumbers.get(s.sessionIdOnchain) ?? 0;
    const metadata = buildSessionMetadata(s, meetingNumber);
    const stagedPath = path.join(STAGING_DIR, `${s.sessionIdOnchain}.json`);
    await fs.writeFile(stagedPath, JSON.stringify(metadata, null, 2), 'utf8');

    let cid: string | null = null;
    if (!dryRun) {
      cid = await pinJsonToIpfs(`${s.sessionIdOnchain}.json`, metadata);
      if (cid) pinned += 1;
    }

    items.push({
      sessionIdOnchain: s.sessionIdOnchain,
      semester: s.semester,
      meetingNumber,
      cid,
      stagedPath,
    });
  }

  logger.info({
    msg: dryRun
      ? 'IPFS metadata staged (dry-run — set PINATA_JWT to pin)'
      : 'IPFS metadata staged and pinned',
    staged: items.length,
    pinned,
    stagingDir: STAGING_DIR,
  });

  return { staged: items.length, pinned, dryRun, stagingDir: STAGING_DIR, items };
}
