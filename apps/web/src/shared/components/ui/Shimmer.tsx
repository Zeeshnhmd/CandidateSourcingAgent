import { cn } from '../../lib/cn';

/** Shape-matched loading placeholder. Compose several to mirror the layout being loaded. */
export function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden className={cn('csa-shimmer rounded-md', className)} />;
}
