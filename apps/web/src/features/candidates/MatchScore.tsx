import type { MatchScore as MatchScoreValue, MatchTier } from '@csa/contracts';
import { Pill, type PillTone } from '../../shared/components/ui/Pill';
import { ScoreRing } from '../../shared/components/ui/ScoreRing';
import { colors } from '../../theme/tokens';

export const TIER_META: Record<MatchTier, { label: string; color: string; tone: PillTone }> = {
  strong: { label: 'Strong', color: colors.success, tone: 'success' },
  good: { label: 'Good', color: colors.info, tone: 'info' },
  partial: { label: 'Partial', color: colors.warning, tone: 'warning' },
  weak: { label: 'Weak', color: colors.dim, tone: 'neutral' },
};

export function TierPill({ tier }: { tier: MatchTier }) {
  const meta = TIER_META[tier];
  return (
    <Pill tone={meta.tone} dot>
      {meta.label}
    </Pill>
  );
}

export function MatchScore({ score, size = 40 }: { score: MatchScoreValue; size?: number }) {
  const meta = TIER_META[score.tier];
  return (
    <div className="flex items-center gap-3">
      <ScoreRing
        value={score.total}
        color={meta.color}
        size={size}
        label={`Match score ${score.total} out of 100, ${meta.label} match`}
      />
      <TierPill tier={score.tier} />
    </div>
  );
}
