import { useId } from 'react';
import { cn } from '../lib/cn';

const PRODUCT_NAME = 'Candidate Sourcing Agent';

/** Ranked shortlist glyph: three bars of decreasing weight with an agent dot. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={cn('shrink-0', className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill={`url(#${gradientId})`} />
      <rect x="8" y="9" width="16" height="3.2" rx="1.6" fill="#fff" />
      <rect x="8" y="14.4" width="11" height="3.2" rx="1.6" fill="#fff" fillOpacity="0.82" />
      <rect x="8" y="19.8" width="6.4" height="3.2" rx="1.6" fill="#fff" fillOpacity="0.6" />
      <circle cx="21.6" cy="21.4" r="3" fill="#A5B4FC" stroke="#fff" strokeWidth="1.4" />
    </svg>
  );
}

export function BrandLockup({ tone = 'light', compact = false }: { tone?: 'light' | 'dark'; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark size={30} />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              'block truncate text-[14px] font-semibold tracking-tight',
              tone === 'dark' ? 'text-white' : 'text-ink',
            )}
          >
            {PRODUCT_NAME}
          </span>
        </span>
      )}
    </div>
  );
}
