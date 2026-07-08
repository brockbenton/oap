'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { usePrivy, useLinkAccount } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import MemberTopNav from '@/components/shared/MemberTopNav';
import PageContainer from '@/components/shared/PageContainer';
import { Avatar, Badge, Button, Input, Textarea } from '@/components/ui';
import { CheckIcon, SignOutIcon } from '@/components/ui/icons';
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

const SECTION_PROFILE = 'profile';
const SECTION_LOGINS = 'logins';
const SECTION_NOTIFICATIONS = 'notifications';
const SECTION_ACCOUNT = 'account';

const SECTION_NAV: ReadonlyArray<{ id: string; label: string }> = [
  { id: SECTION_PROFILE, label: 'Profile' },
  { id: SECTION_LOGINS, label: 'Logins' },
  { id: SECTION_NOTIFICATIONS, label: 'Notifications' },
  { id: SECTION_ACCOUNT, label: 'Account' },
];

const SECTION_CARD = 'scroll-mt-20 rounded-lg border border-line bg-white p-6';
const SECTION_HEADING = 'text-[17px] font-semibold';
const SECTION_CAPTION = 'mt-1 text-sm text-content-secondary';

// Privy keeps every user on ≥1 linked account, so the last one can't be unlinked.
const MIN_LINKED_ACCOUNTS = 1;
const PASSKEY_ACCOUNT_TYPE = 'passkey';
const EMAIL_MASK = '•••';
const NOT_CONNECTED = 'Not connected';
const PASSKEY_LINKED_LABEL = 'Passkey registered';
const ONLY_LOGIN_HINT = 'Keep at least one login method.';

// A contact address is never surfaced raw: keep the first char + domain only.
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return EMAIL_MASK;
  return `${email[0]}${EMAIL_MASK}${email.slice(at)}`;
}

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

  // Surface any non-"taken" failure (the "taken" case shows under the field).
  // A thrown non-API error is almost always the backend being unreachable.
  const saveErrorMessage =
    !updateProfile.isError || usernameTaken
      ? null
      : updateProfile.error instanceof ApiRequestError
        ? updateProfile.error.message
        : "Couldn't save — check your connection and try again.";

  const onSave = () => {
    if (!dirty || usernameInvalid) return;
    updateProfile.mutate(patch);
  };

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <MemberTopNav />
      <PageContainer className="py-8">
        <h1 className="mb-6 text-[30px] font-semibold leading-9 tracking-[-1px]">Settings</h1>

        <div className="lg:flex lg:gap-10">
          <nav className="hidden lg:block lg:w-44 lg:shrink-0">
            <div className="sticky top-20 space-y-1">
              {SECTION_NAV.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block rounded-md px-3 py-1.5 text-sm font-medium text-content-secondary transition-colors hover:bg-card-filled hover:text-ink"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="min-w-0 flex-1 space-y-6">
            <section id="profile" className={SECTION_CARD}>
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
                  {saveErrorMessage && (
                    <span className="text-sm text-status-neg">{saveErrorMessage}</span>
                  )}
                </div>
              </div>
            </section>

            <LoginsSection />
            <NotificationsSection />
            <AccountSection />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

function LoginsSection() {
  const { user, unlinkEmail, unlinkGoogle, unlinkPasskey } = usePrivy();
  const { linkEmail, linkGoogle, linkPasskey } = useLinkAccount();

  if (!user) return null;

  const email = user.email?.address;
  const google = user.google;
  const passkey = user.linkedAccounts.find((account) => account.type === PASSKEY_ACCOUNT_TYPE);
  const isOnlyLogin = user.linkedAccounts.length <= MIN_LINKED_ACCOUNTS;

  const rows: ReadonlyArray<{
    key: string;
    label: string;
    connected: boolean;
    detail: string;
    onConnect: () => void;
    onUnlink: () => void;
  }> = [
    {
      key: SECTION_LOGINS + '-email',
      label: 'Email',
      connected: Boolean(email),
      detail: email ? maskEmail(email) : NOT_CONNECTED,
      onConnect: linkEmail,
      onUnlink: () => {
        if (email) unlinkEmail(email);
      },
    },
    {
      key: SECTION_LOGINS + '-google',
      label: 'Google',
      connected: Boolean(google),
      detail: google ? maskEmail(google.email) : NOT_CONNECTED,
      onConnect: linkGoogle,
      onUnlink: () => {
        if (google) unlinkGoogle(google.subject);
      },
    },
    {
      key: SECTION_LOGINS + '-passkey',
      label: 'Passkey',
      connected: Boolean(passkey),
      detail:
        passkey?.type === PASSKEY_ACCOUNT_TYPE
          ? (passkey.authenticatorName ?? PASSKEY_LINKED_LABEL)
          : NOT_CONNECTED,
      onConnect: linkPasskey,
      onUnlink: () => {
        if (passkey?.type === PASSKEY_ACCOUNT_TYPE) unlinkPasskey(passkey.credentialId);
      },
    },
  ];

  return (
    <section id={SECTION_LOGINS} className={SECTION_CARD}>
      <h2 className={SECTION_HEADING}>Linked logins</h2>
      <p className={SECTION_CAPTION}>Ways you can sign in to your account.</p>

      <div className="mt-5 divide-y divide-line">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{row.label}</span>
                {row.connected && <Badge tone="pos">Connected</Badge>}
              </div>
              <div className="mt-0.5 truncate text-xs text-content-secondary">{row.detail}</div>
            </div>
            {row.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={row.onUnlink}
                disabled={isOnlyLogin}
                title={isOnlyLogin ? ONLY_LOGIN_HINT : undefined}
              >
                Unlink
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={row.onConnect}>
                Connect
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationsSection() {
  const { data: profile } = useProfile();
  const updateNotify = useUpdateProfile();

  const savedNotify = profile?.notifyEmail ?? false;
  const pendingNotify = updateNotify.isPending ? updateNotify.variables?.notifyEmail : undefined;
  const checked = pendingNotify ?? savedNotify;

  const toggle = () => {
    if (updateNotify.isPending) return;
    updateNotify.mutate({ notifyEmail: !checked });
  };

  return (
    <section id={SECTION_NOTIFICATIONS} className={SECTION_CARD}>
      <h2 className={SECTION_HEADING}>Notifications</h2>
      <p className={SECTION_CAPTION}>Choose what lands in your inbox.</p>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Email me attendance summaries</div>
          <p className="mt-1 text-xs text-content-secondary">
            We&apos;ll only use this once notifications ship — no emails are sent yet.
          </p>
        </div>
        <ToggleSwitch
          checked={checked}
          disabled={updateNotify.isPending}
          onChange={toggle}
          label="Email me attendance summaries"
        />
      </div>

      {updateNotify.isError && (
        <p className="mt-3 text-xs text-status-neg">Couldn&apos;t update your preference. Please try again.</p>
      )}
    </section>
  );
}

function AccountSection() {
  const { logout } = usePrivy();

  return (
    <section id={SECTION_ACCOUNT} className={SECTION_CARD}>
      <h2 className={SECTION_HEADING}>Account</h2>
      <p className={SECTION_CAPTION}>Sign out of OAP on this device.</p>

      <div className="mt-5">
        <Button variant="outline" onClick={() => logout()}>
          <SignOutIcon size={16} /> Sign out
        </Button>
      </div>

      <div className="mt-6 rounded-md border border-line bg-card-filled p-4">
        <div className="text-[13px] font-semibold text-status-neg">Danger zone</div>
        <p className="mt-1 text-xs text-content-secondary">
          Disconnecting or deleting your account isn&apos;t available yet. When it ships it&apos;ll permanently
          remove your profile and unlink your logins.
        </p>
      </div>
    </section>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}

function ToggleSwitch({ checked, disabled, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-ink' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfc]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
    </div>
  );
}
