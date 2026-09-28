import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { score } from '../../test/fixtures';
import { ScoreBreakdown } from './ScoreBreakdown';

describe('ScoreBreakdown', () => {
  it('shows points per component and explains excluded components', () => {
    render(<ScoreBreakdown score={score} />);

    expect(screen.getByText('Must-have skills')).toBeInTheDocument();
    expect(screen.getByText('4 relevant years (5+ required)')).toBeInTheDocument();
    expect(screen.getByText('Not scored')).toBeInTheDocument();
    expect(screen.getByText('Excluded: GitHub rate limit reached')).toBeInTheDocument();
    expect(screen.getByText(/50\.0 earned of 90 applicable points, scaled to 100/)).toBeInTheDocument();
  });
});
