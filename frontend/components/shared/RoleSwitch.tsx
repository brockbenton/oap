import Link from 'next/link';
import { cn } from '@/lib/cn';

type Role = 'member' | 'admin';

const ROLES: { key: Role; label: string; href: string }[] = [
  { key: 'member', label: 'Member', href: '/' },
  { key: 'admin', label: 'Admin', href: '/admin' },
];

// Admins are members too, so they move between both dashboards.
export default function RoleSwitch({ active }: { active: Role }) {
  return (
    <div className="flex rounded border border-line p-0.5">
      {ROLES.map((role) => (
        <Link
          key={role.key}
          href={role.href}
          aria-current={active === role.key ? 'page' : undefined}
          className={cn(
            'rounded-sm px-2.5 py-1 text-xs transition-colors',
            active === role.key ? 'bg-raised text-content' : 'text-content-secondary hover:text-content',
          )}
        >
          {role.label}
        </Link>
      ))}
    </div>
  );
}
