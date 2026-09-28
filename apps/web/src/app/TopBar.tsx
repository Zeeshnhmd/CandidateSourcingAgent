import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown, ChevronRight, LogOut, Menu } from 'lucide-react';
import { Fragment } from 'react';
import { Link, useMatches } from 'react-router';
import { useAuth } from '../features/auth/authContext';
import { Avatar } from '../shared/components/ui/Avatar';
import { IntegrationStatus } from './IntegrationStatus';

export interface Crumb {
  label: string;
  to?: string;
}

/** Route `handle` shape used to build the breadcrumb. */
export interface RouteHandle {
  crumbs: Crumb[];
}

function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'crumbs' in value && Array.isArray(value.crumbs);
}

function Breadcrumb() {
  const matches = useMatches();
  const crumbs = [...matches].reverse().find((match) => isRouteHandle(match.handle))?.handle;
  if (!isRouteHandle(crumbs)) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none items-center gap-1.5 p-0 text-[13.5px]">
        {crumbs.crumbs.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 && <ChevronRight size={14} className="shrink-0 text-dim" aria-hidden />}
            <li className="min-w-0 truncate">
              {crumb.to ? (
                <Link to={crumb.to} className="text-muted transition-colors hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-ink" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

function UserMenu() {
  const { session, signOut } = useAuth();
  if (!session) return null;

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      disabled: true,
      label: (
        <div className="py-0.5">
          <p className="m-0 text-[13px] font-medium text-ink">{session.user.name}</p>
          <p className="m-0 text-xs text-muted">{session.user.email}</p>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'sign-out', icon: <LogOut size={15} aria-hidden />, label: 'Sign out', onClick: () => signOut('user') },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        aria-label="Account menu"
        className="flex h-9 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-subtle"
      >
        <Avatar name={session.user.name} size={28} />
        <span className="hidden text-[13px] font-medium text-ink sm:inline">{session.user.name}</span>
        <ChevronDown size={14} className="hidden text-dim sm:inline" aria-hidden />
      </button>
    </Dropdown>
  );
}

export function TopBar({ onOpenNavigation }: { onOpenNavigation?: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-6">
      {onOpenNavigation && (
        <button
          type="button"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          className="-ml-1 rounded-md p-1.5 text-body hover:bg-subtle lg:hidden"
        >
          <Menu size={20} aria-hidden />
        </button>
      )}
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-1">
        <IntegrationStatus />
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <UserMenu />
      </div>
    </header>
  );
}
