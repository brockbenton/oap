import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  caption?: ReactNode;
  action?: ReactNode;
}

export default function AdminPageHeader({ title, caption, action }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-medium text-content">{title}</h1>
        {caption && <p className="mt-1 text-sm text-content-secondary">{caption}</p>}
      </div>
      {action}
    </div>
  );
}
