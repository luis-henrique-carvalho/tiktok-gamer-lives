import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AudioEffectPlayer } from '../audio-effect-player';

describe('AudioEffectPlayer', () => {
  it('renders nothing when audio is not suspended', () => {
    const onResume = vi.fn();
    const { container } = render(
      <AudioEffectPlayer isAudioSuspended={false} onResumeAudio={onResume} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders audio activation button when audio is suspended and handles click', () => {
    const onResume = vi.fn();
    render(
      <AudioEffectPlayer isAudioSuspended={true} onResumeAudio={onResume} />,
    );

    const button = screen.getByRole('button', {
      name: /clique para ativar áudio/i,
    });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onResume).toHaveBeenCalledTimes(1);
  });
});
