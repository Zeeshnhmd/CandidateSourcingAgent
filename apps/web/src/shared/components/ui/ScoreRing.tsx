import { colors } from '../../../theme/tokens';

interface ScoreRingProps {
  value: number;
  color: string;
  size?: number;
  /** Accessible description. Omit for decorative use. */
  label?: string;
}

/** Circular 0 to 100 gauge with the value in the middle. */
export function ScoreRing({ value, color, size = 40, label }: ScoreRingProps) {
  const stroke = size >= 56 ? 5 : 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.subtle} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-ink"
        style={{ fontSize: Math.round(size * (size >= 56 ? 0.3 : 0.32)) }}
      >
        {Math.round(value)}
      </span>
    </span>
  );
}
