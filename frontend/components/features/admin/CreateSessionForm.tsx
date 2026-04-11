'use client';

import { useState } from 'react';
import { getIdentityToken } from '@privy-io/react-auth';
import { useMutation } from '@tanstack/react-query';
import { createSession } from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/client';

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
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
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
      <h2 className="text-base font-semibold text-gray-900 mb-4">Create Session</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Meeting Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Kickoff"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Date &amp; Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Semester</label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. Spring 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {errorMessage && <p className="text-red-600 text-sm">{errorMessage}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="py-2 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </section>
  );
}
