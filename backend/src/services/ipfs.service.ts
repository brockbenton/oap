import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { APP_NAME } from '../lib/brand';

/**
 * Metadata / IPFS pipeline. Per resolved Open Question #2, token art is one
 * generic image per SEMESTER (not per meeting), so each session's metadata
 * points at its semester's art CID. JSONs are pinned under a directory whose CID
 * becomes the contract baseCid, making uri(id) → ipfs://{baseCid}/{id}.json resolve.
 */
const PINATA_PIN_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const METADATA_DIR_NAME = 'attendance-metadata';

// Fallback art CID used when a semester has no explicit mapping configured.
const DEFAULT_ART_CID =
  process.env.DEFAULT_SEMESTER_ART_CID ?? 'bafybeic0clubart0000000000000000000000000000000000000000000000';

// Staging directory for generated metadata before/without pinning (dry-run).
const STAGING_DIR = path.join(process.cwd(), 'ipfs-staging');

const METADATA_NAME_PREFIX = APP_NAME;
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
 * Pins the staged metadata directory to IPFS and returns the single directory
 * CID. The contract resolves uri(id) → ipfs://{baseCid}/{id}.json, so metadata
 * must live under ONE directory CID — pinning files individually would not
 * resolve. Requires PINATA_JWT (callers guard with the dry-run check).
 */
async function pinDirectoryToIpfs(dir: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  const names = await fs.readdir(dir);
  const form = new FormData();
  for (const name of names) {
    const content = await fs.readFile(path.join(dir, name));
    form.append('file', new Blob([content], { type: 'application/json' }), `${METADATA_DIR_NAME}/${name}`);
  }
  form.append('pinataMetadata', JSON.stringify({ name: METADATA_DIR_NAME }));

  const res = await fetch(PINATA_PIN_FILE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Pinata directory pin failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { IpfsHash?: string };
  if (!body.IpfsHash) throw new Error('Pinata response missing IpfsHash');
  return body.IpfsHash;
}

export interface PublishItem {
  sessionIdOnchain: string;
  semester: string;
  meetingNumber: number;
  stagedPath: string;
}

export interface PublishResult {
  staged: number;
  dryRun: boolean;
  baseCid: string | null;
  stagingDir: string;
  items: PublishItem[];
}

/**
 * Generates ERC-1155 metadata for every confirmed session into a fresh staging
 * directory, then (when Pinata is configured) pins the whole directory and
 * returns its base CID — the value to set on the contract via setBaseCid.
 */
export async function publishSemesterMetadata(): Promise<PublishResult> {
  const sessions = await prisma.session.findMany({
    where: { onchainStatus: 'CONFIRMED' },
    select: { sessionIdOnchain: true, name: true, date: true, semester: true },
    orderBy: { date: 'asc' },
  });

  const meetingNumbers = buildMeetingNumberMap(sessions);
  const dryRun = !process.env.PINATA_JWT;

  // Rebuild the dir so its directory CID reflects exactly the current sessions.
  await fs.rm(STAGING_DIR, { recursive: true, force: true });
  await fs.mkdir(STAGING_DIR, { recursive: true });

  const items: PublishItem[] = [];
  for (const s of sessions) {
    const meetingNumber = meetingNumbers.get(s.sessionIdOnchain) ?? 0;
    const metadata = buildSessionMetadata(s, meetingNumber);
    const stagedPath = path.join(STAGING_DIR, `${s.sessionIdOnchain}.json`);
    await fs.writeFile(stagedPath, JSON.stringify(metadata, null, 2), 'utf8');
    items.push({ sessionIdOnchain: s.sessionIdOnchain, semester: s.semester, meetingNumber, stagedPath });
  }

  const baseCid = dryRun || items.length === 0 ? null : await pinDirectoryToIpfs(STAGING_DIR);

  logger.info({
    msg: dryRun
      ? 'IPFS metadata staged (dry-run — set PINATA_JWT to pin)'
      : 'IPFS metadata staged and pinned',
    staged: items.length,
    baseCid,
    stagingDir: STAGING_DIR,
  });

  return { staged: items.length, dryRun, baseCid, stagingDir: STAGING_DIR, items };
}
