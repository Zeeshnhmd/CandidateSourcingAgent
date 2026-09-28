import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { persona } from '../../test/fixtures';
import { PersonaEditor } from './PersonaEditor';

describe('PersonaEditor', () => {
  it('submits the reviewed persona', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PersonaEditor persona={persona} submitting={false} onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText('Role title'));
    await user.type(screen.getByLabelText('Role title'), '  Lead Frontend Engineer ');
    await user.click(screen.getByRole('button', { name: /Start sourcing/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ roleTitle: 'Lead Frontend Engineer', mustHaveSkills: ['React', 'TypeScript'] }),
    );
  });

  it('blocks invalid cross-field values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PersonaEditor
        persona={{ ...persona, maxYearsExperience: 2, niceToHaveSkills: ['react'], mustHaveSkills: ['React'] }}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Start sourcing/ }));

    expect(await screen.findByText('Maximum must be at least the minimum')).toBeInTheDocument();
    expect(screen.getByText('Already a must-have: react')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
