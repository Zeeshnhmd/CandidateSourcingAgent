import { Tooltip } from 'antd';
import { Bookmark, ChevronsLeft, ChevronsRight, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useSavedSearches } from '../features/sourcing/useSourcingRuns';
import { BrandLockup } from '../shared/components/BrandMark';
import { cn } from '../shared/lib/cn';
import { formatRelativeTime } from '../shared/lib/format';

const RECENT_LIMIT = 6;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile off-canvas mode. */
  onClose?: () => void;
}

function NavItem({
  to,
  icon,
  label,
  collapsed,
  end,
  badge,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex h-9 items-center gap-2.5 rounded-lg text-[13.5px] transition-colors',
          collapsed ? 'justify-center px-0' : 'px-2.5',
          isActive
            ? 'bg-sidebar-raised font-medium text-white'
            : 'text-sidebar-text hover:bg-sidebar-raised/60 hover:text-sidebar-strong',
        )
      }
    >
      {icon}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="rounded-md bg-sidebar-line px-1.5 text-[11px] font-medium tabular-nums text-sidebar-strong">
          {badge}
        </span>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip title={label} placement="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function Sidebar({ collapsed, onToggleCollapsed, onClose }: SidebarProps) {
  const { data: searches } = useSavedSearches();
  const recent = searches?.slice(0, RECENT_LIMIT) ?? [];

  const newSearch = (
    <NavLink
      to="/"
      end
      className={cn(
        'flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-white transition-colors hover:bg-primary-hover',
        collapsed ? 'w-9' : 'w-full',
      )}
    >
      <Plus size={16} strokeWidth={2.25} aria-hidden />
      {!collapsed ? 'New search' : <span className="sr-only">New search</span>}
    </NavLink>
  );

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-sidebar-line bg-sidebar transition-[width] duration-200 ease-out',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
      aria-label="Primary"
    >
      <div className={cn('flex h-14 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between px-4')}>
        <BrandLockup tone="dark" compact={collapsed} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-sidebar-text hover:bg-sidebar-raised hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      <div className={cn('pb-2 pt-1', collapsed ? 'flex justify-center' : 'px-3')}>
        {collapsed ? (
          <Tooltip title="New search" placement="right">
            {newSearch}
          </Tooltip>
        ) : (
          newSearch
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto pb-4', collapsed ? 'px-3.5' : 'px-3')} aria-label="Main">
        <ul className="m-0 list-none space-y-0.5 p-0">
          <li>
            <NavItem
              to="/searches"
              end
              icon={<Bookmark size={17} aria-hidden className="shrink-0" />}
              label="Saved searches"
              collapsed={collapsed}
              badge={searches?.length}
            />
          </li>
        </ul>

        {!collapsed && recent.length > 0 && (
          <div className="mt-6">
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-text/70">
              Recent
            </p>
            <ul className="m-0 list-none space-y-0.5 p-0">
              {recent.map((search) => (
                <li key={search.id}>
                  <NavLink
                    to={`/searches/${search.id}`}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-lg px-2.5 py-2 transition-colors',
                        isActive ? 'bg-sidebar-raised' : 'hover:bg-sidebar-raised/60',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'block truncate text-[13px]',
                            isActive ? 'font-medium text-white' : 'text-sidebar-strong/90',
                          )}
                        >
                          {search.roleTitle}
                        </span>
                        <span className="block truncate text-[11.5px] text-sidebar-text">
                          {search.candidateCount} candidates · {formatRelativeTime(search.createdAt)}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {!onClose && (
        <div className={cn('shrink-0 border-t border-sidebar-line p-3', collapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md text-[12.5px] text-sidebar-text transition-colors hover:bg-sidebar-raised hover:text-sidebar-strong',
              collapsed ? 'w-8 justify-center' : 'w-full px-2.5',
            )}
          >
            {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      )}
    </aside>
  );
}
