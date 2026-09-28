import type { ReactNode } from 'react';
import { Tag } from 'antd';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type SkillTagTone = 'neutral' | 'matched' | 'nice' | 'missing' | 'subtle';

const TONE: Record<SkillTagTone, { className: string; icon: ReactNode }> = {
  neutral: { className: 'border-line bg-surface text-body', icon: null },
  matched: {
    className: 'border-line bg-surface text-ink',
    icon: <Check size={12} strokeWidth={2.5} className="text-success" aria-hidden />,
  },
  nice: {
    className: 'border-line bg-surface text-ink',
    icon: <Plus size={12} strokeWidth={2.5} className="text-primary" aria-hidden />,
  },
  missing: {
    className: 'border-dashed border-line bg-transparent text-muted',
    icon: <X size={11} strokeWidth={2.5} className="text-dim" aria-hidden />,
  },
  subtle: { className: 'border-transparent bg-subtle text-body', icon: null },
};

export interface SkillTagProps {
  children: ReactNode;
  tone?: SkillTagTone;
  /** Small trailing number, for example a repository count. */
  count?: number;
  className?: string;
}

/**
 * Compact chip for skills, languages and keywords. Meaning comes from a leading icon rather than a fill colour,
 * which keeps dense tables calm and scannable.
 */
export function SkillTag({ children, tone = 'neutral', count, className }: SkillTagProps) {
  const styles = TONE[tone];
  return (
    <Tag
      className={cn(
        'm-0 inline-flex h-6 max-w-full items-center gap-1 overflow-hidden rounded-md px-2 text-xs font-medium leading-none',
        styles.className,
        className,
      )}
    >
      {styles.icon && <span className="shrink-0">{styles.icon}</span>}
      <span className="truncate">{children}</span>
      {count !== undefined && <span className="font-normal tabular-nums text-dim">{count}</span>}
    </Tag>
  );
}
