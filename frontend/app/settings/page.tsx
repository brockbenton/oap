'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import MemberTopNav from '@/components/shared/MemberTopNav';
import PageContainer from '@/components/shared/PageContainer';
import { Avatar, Button, Input, Textarea } from '@/components/ui';
import { CheckIcon } from '@/components/ui/icons';
import { useProfile, useUpdateProfile, useEmbeddedAddress } from '@/hooks/useProfile';
import { shortenAddress } from '@/lib/address';
import { AVATAR_COLOR_COUNT, avatarGradientByIndex } from '@/lib/tokenArt';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import type { ProfilePatch } from '@/lib/api/profile';

const USERNAME_REGEX = /^[a-z0-9_.-]{3,20}$/;
const USERNAME_HINT = '3–20 characters: a–z, 0–9, and . _ -';
const BIO_MAX_LENGTH = 160;
const AVATAR_SIZE = 64;
const COLOR_SWATCHES = Array.from({ length: AVATAR_COLOR_COUNT }, (_, i) => i);

export default function SettingsPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const address = useEmbeddedAddress();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState<number | null>(null);
  const [bio, setBio] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) router.replace('/');
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (profile && !initialized) {
      setUsername(profile.username ?? '');
      setAvatarColor(profile.avatarColor);
      setBio(profile.bio ?? '');
      setInitialized(true);
    }
  }, [profile, initialized]);

  if (!ready || !authenticated) return <FullPageSpinner />;

  const usernameInvalid = username.length > 0 && !USERNAME_REGEX.test(username);
  const seed = address ?? 'account';
  const previewName = username || profile?.username || (address ? shortenAddress(address) : 'Member');

  const patch: ProfilePatch = {};
  if (username && username !== (profile?.username ?? '')) patch.username = username;
  if (avatarColor !== (profile?.avatarColor ?? null)) patch.avatarColor = avatarColor;
  if ((bio || null) !== (profile?.bio ?? null)) patch.bio = bio || null;
  const dirty = Object.keys(patch).length > 0;

  const usernameTaken =
    updateProfile.error instanceof ApiRequestError && updateProfile.error.code === 'USERNAME_TAKEN';

  const onSave = () => {
    if (!dirty || usernameInvalid) return;
    updateProfile.mutate(patch);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <MemberTopNav />
      <PageContainer className="py-8">
        <h1 className="mb-6 text-[30px] font-semibold leading-9 tracking-[-1px]">Settings</h1>

        <section
          id="profile"
          className="scroll-mt-20 rounded-lg border border-line bg-white p-6"
        >
          <h2 className="text-[17px] font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-content-secondary">
            How you appear across OAP. Your email is never shown publicly.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <Avatar seed={seed} label={previewName} colorIndex={avatarColor} size={AVATAR_SIZE} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">{previewName}</div>
              {address && (
                <div className="mt-1 font-mono text-xs text-content-secondary">{shortenAddress(address)}</div>
              )}
            </div>
          </div>

          <div className="mt-6 max-w-md space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Username</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="satoshi"
                maxLength={20}
                aria-invalid={usernameInvalid || usernameTaken}
              />
              <span
                className={cn(
                  'mt-1.5 block text-xs',
                  usernameInvalid || usernameTaken ? 'text-status-neg' : 'text-content-secondary',
                )}
              >
                {usernameTaken ? 'That username is already taken.' : USERNAME_HINT}
              </span>
            </label>

            <div>
              <span className="mb-2 block text-[13px] font-semibold">Profile color</span>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_SWATCHES.map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Color ${i + 1}`}
                    aria-pressed={avatarColor === i}
                    onClick={() => setAvatarColor(i)}
                    className={cn(
                      'h-9 w-9 rounded-full ring-2 ring-offset-2 transition',
                      avatarColor === i ? 'ring-ink' : 'ring-transparent hover:ring-line',
                    )}
                    style={{ background: avatarGradientByIndex(i) }}
                  />
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">Bio</span>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A little about you…"
                maxLength={BIO_MAX_LENGTH}
              />
              <span className="mt-1.5 block text-right text-xs text-content-secondary tabular-nums">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            </label>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={onSave}
                disabled={!dirty || usernameInvalid || updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              {updateProfile.isSuccess && !dirty && (
                <span className="inline-flex items-center gap-1 text-sm text-status-pos">
                  <CheckIcon size={16} /> Saved
                </span>
              )}
            </div>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfc]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
    </div>
  );
}
