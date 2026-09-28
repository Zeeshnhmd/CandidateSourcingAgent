import { Popover } from 'antd';
import { Bot, ChevronDown, Database } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IntegrationId, IntegrationState } from '@csa/contracts';
import { GitHubMark } from '../shared/components/ui/GitHubMark';
import { Pill, type PillTone } from '../shared/components/ui/Pill';
import { useSystemStatus } from '../shared/hooks/useSystemStatus';
import { cn } from '../shared/lib/cn';

const ICON: Record<IntegrationId, ReactNode> = {
  'talent-source': <Database size={15} aria-hidden />,
  ai: <Bot size={15} aria-hidden />,
  github: <GitHubMark size={14} />,
};

const STATE: Record<IntegrationState, { label: string; tone: PillTone }> = {
  live: { label: 'Live', tone: 'success' },
  fallback: { label: 'Fallback', tone: 'warning' },
  offline: { label: 'Offline', tone: 'danger' },
};

/** Compact health indicator for the top bar, with per-integration detail on click. */
export function IntegrationStatus() {
  const { data, isError } = useSystemStatus();
  const integrations = data?.integrations ?? [];
  const live = integrations.filter((item) => item.state === 'live').length;
  const worst: IntegrationState = integrations.some((item) => item.state === 'offline')
    ? 'offline'
    : integrations.some((item) => item.state === 'fallback')
      ? 'fallback'
      : 'live';

  const summary = isError
    ? 'Status unavailable'
    : !data
      ? 'Checking services'
      : worst === 'live'
        ? 'All services live'
        : `${live} of ${integrations.length} services live`;

  const content = (
    <div className="w-80">
      <div className="border-b border-line-soft px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">Services</p>
        <p className="text-xs text-muted">Providers used for discovery, evidence and analysis</p>
      </div>
      <ul className="divide-y divide-line-soft">
        {integrations.map((integration) => (
          <li key={`${integration.id}-${integration.label}`} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-subtle text-body">
              {ICON[integration.id]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-ink">{integration.label}</span>
                <Pill tone={STATE[integration.state].tone} dot pulse={integration.state === 'live'}>
                  {STATE[integration.state].label}
                </Pill>
              </div>
              <p className="mt-0.5 text-xs leading-5 text-muted">{integration.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      styles={{ container: { padding: 0 } }}
    >
      <button
        type="button"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] text-body transition-colors hover:bg-subtle"
        aria-label={`Service status: ${summary}`}
      >
        <span
          className={cn(
            'size-2 rounded-full',
            isError || !data
              ? 'bg-dim'
              : worst === 'live'
                ? 'bg-success'
                : worst === 'fallback'
                  ? 'bg-warning'
                  : 'bg-danger',
          )}
        />
        <span className="hidden md:inline">{summary}</span>
        <ChevronDown size={14} className="text-dim" aria-hidden />
      </button>
    </Popover>
  );
}
