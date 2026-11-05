'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createSession } from '@/lib/api/admin';
import { requireIdentityToken, ApiRequestError } from '@/lib/api/client';

interface CreateSessionFormProps {
  onSuccess: () => void;
}

export default function CreateSessionForm({ onSuccess }: CreateSessionFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [semester, setSemester] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const token = await requireIdentityToken();
      const sessionId = Date.now().toString();
      return createSession(
        { sessionId, date: new Date(date).toISOString(), name: name.trim(), semester: semester.trim() },
        token,
      );
    },
    onSuccess: () => {
      setName('');
      setDate('');
      setSemester('');
      setErrorMessage('');
      onSuccess();
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage((err instanceof Error ? err.message : 'Failed to create session').slice(0, 200));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !semester.trim()) return;
    setErrorMessage('');
    mutate();
  };

  return (
    <section>
      <h2 className="text-base font-semibold text-content mb-4">Create Session</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-line rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Meeting Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Kickoff"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Date &amp; Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-content">Semester</label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. Spring 2026"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green"
              required
            />
          </div>
        </div>

        {errorMessage && <p className="text-status-neg text-sm">{errorMessage}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="py-2 px-5 rounded-lg bg-green text-canvas text-sm font-semibold hover:bg-green-dim disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </section>
  );
}
