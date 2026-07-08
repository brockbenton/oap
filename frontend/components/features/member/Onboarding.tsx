'use client';

import { useState } from 'react';
import { Avatar, Button, Input } from '@/components/ui';
import { useUpdateProfile, useEmbeddedAddress } from '@/hooks/useProfile';
import { shortenAddress } from '@/lib/address';
import { AVATAR_COLOR_COUNT, avatarGradientByIndex } from '@/lib/tokenArt';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

const USERNAME_REGEX = /^[a-z0-9_.-]{3,20}$/;
const USERNAME_HINT = '3–20 characters: a–z, 0–9, and . _ -';
const USERNAME_TAKEN_MESSAGE = 'That username is already taken.';
const AVATAR_SIZE = 88;
// Onboarding always shows a selected swatch, so seed the picker rather than
// leaving it null the way an edit form would.
const DEFAULT_AVATAR_COLOR = 0;
const COLOR_SWATCHES = Array.from({ length: AVATAR_COLOR_COUNT }, (_, i) => i);

const HEADING = 'Welcome to OAP';
const SUBHEADING =
  'Set up your profile to get started. Pick a username and a color — you can change both anytime in Settings.';
const USERNAME_LABEL = 'Username';
const USERNAME_PLACEHOLDER = 'satoshi';
const COLOR_LABEL = 'Profile color';
const CONTINUE_LABEL = 'Continue';
const CONTINUE_PENDING_LABEL = 'Setting up…';
const FALLBACK_NAME = 'Member';

export default function Onboarding() {
  const address = useEmbeddedAddress();
  const updateProfile = useUpdateProfile();

  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState(DEFAULT_AVATAR_COLOR);

  const usernameValid = USERNAME_REGEX.test(username);
  const usernameInvalid = username.length > 0 && !usernameValid;
  const usernameTaken =
    updateProfile.error instanceof ApiRequestError && updateProfile.error.code === 'USERNAME_TAKEN';

  // Any non-"taken" failure otherwise leaves a new member stuck with no feedback.
  const submitErrorMessage =
    !updateProfile.isError || usernameTaken
      ? null
      : updateProfile.error instanceof ApiRequestError
        ? updateProfile.error.message
        : "Couldn't save — check your connection and try again.";

  const seed = address ?? 'account';
  const previewName = username || (address ? shortenAddress(address) : FALLBACK_NAME);

  const onContinue = () => {
    if (!usernameValid) return;
    updateProfile.mutate({ username, avatarColor });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfc] px-6 py-12">
      <div className="w-full max-w-md animate-fade-in rounded-lg border border-line bg-white p-8">
        <div className="flex flex-col items-center text-center">
          <Avatar seed={seed} label={previewName} colorIndex={avatarColor} size={AVATAR_SIZE} />
          <h1 className="mt-5 text-[26px] font-semibold leading-8 tracking-[-0.5px]">{HEADING}</h1>
          <p className="mt-2 text-sm leading-5 text-content-secondary">{SUBHEADING}</p>
        </div>

        <div className="mt-7 space-y-6">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold">{USERNAME_LABEL}</span>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder={USERNAME_PLACEHOLDER}
              maxLength={20}
              autoFocus
              aria-invalid={usernameInvalid || usernameTaken}
            />
            <span
              className={cn(
                'mt-1.5 block text-xs',
                usernameInvalid || usernameTaken ? 'text-status-neg' : 'text-content-secondary',
              )}
            >
              {usernameTaken ? USERNAME_TAKEN_MESSAGE : USERNAME_HINT}
            </span>
          </label>

          <div>
            <span className="mb-2 block text-[13px] font-semibold">{COLOR_LABEL}</span>
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

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onContinue}
            disabled={!usernameValid || updateProfile.isPending}
          >
            {updateProfile.isPending ? CONTINUE_PENDING_LABEL : CONTINUE_LABEL}
          </Button>
          {submitErrorMessage && (
            <p className="text-center text-sm text-status-neg">{submitErrorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
