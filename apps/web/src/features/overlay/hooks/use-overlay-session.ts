import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/api/client';
import { realtimeClient, type RealtimeClient } from '@/lib/socket-client';
import { useOverlayStore } from '../stores/use-overlay-store';
import {
  AudioEffectEngine,
  type AudioContextLike,
} from '../audio/audio-effect-engine';
import type { AxBConfig, GameSession } from '@/api/types';

export interface UseOverlaySessionOptions {
  readonly sessionId: string | null;
  readonly volume: number;
  readonly muted: boolean;
  readonly realtime?: RealtimeClient;
  readonly audioContextFactory?: () => AudioContextLike;
}

function useOverlayAudio(
  volume: number,
  muted: boolean,
  audioContextFactory?: () => AudioContextLike,
) {
  const audioEngineRef = useRef<AudioEffectEngine | null>(null);
  const [isAudioSuspended, setIsAudioSuspended] = useState(false);

  useEffect(() => {
    const engine = new AudioEffectEngine({
      contextFactory: audioContextFactory,
      initialVolume: volume,
      initialMuted: muted,
    });
    audioEngineRef.current = engine;
    setIsAudioSuspended(engine.isSuspended());

    engine
      .resume()
      .then(() => setIsAudioSuspended(engine.isSuspended()))
      .catch(() => setIsAudioSuspended(true));

    return () => {
      engine.dispose().catch(() => {});
      audioEngineRef.current = null;
    };
  }, [audioContextFactory]);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setVolume(volume);
      audioEngineRef.current.setMuted(muted);
    }
  }, [volume, muted]);

  const resumeAudio = useCallback(async () => {
    if (audioEngineRef.current) {
      await audioEngineRef.current.resume();
      setIsAudioSuspended(audioEngineRef.current.isSuspended());
    }
  }, []);

  return { audioEngineRef, isAudioSuspended, resumeAudio };
}

function useOverlayRealtime(
  sessionId: string | null,
  realtime: RealtimeClient,
  audioEngineRef: React.RefObject<AudioEffectEngine | null>,
) {
  useEffect(() => {
    if (!sessionId) {
      useOverlayStore.getState().setConnected(false);
      return;
    }

    realtime.connect();
    realtime.joinSession(sessionId);

    const unsubStatus = realtime.onStatusChange((c) => {
      useOverlayStore.getState().setConnected(c);
    });

    const unsubSnapshot = realtime.onSnapshot((s) => {
      if (s.sessionId === sessionId) {
        if (s.gameId) useOverlayStore.getState().setGameId(s.gameId);
        const { celebrationTriggered } = useOverlayStore
          .getState()
          .applyProjection(s.projection);
        if (celebrationTriggered) audioEngineRef.current?.playFanfare();
      }
    });

    const unsubAlert = realtime.onAlert((a) => {
      useOverlayStore.getState().pushAlert(a);
      audioEngineRef.current?.playContribution(a.resourceKey);
    });

    return () => {
      realtime.leaveSession(sessionId);
      unsubStatus();
      unsubSnapshot();
      unsubAlert();
    };
  }, [sessionId, realtime, audioEngineRef]);

  useEffect(() => {
    const timer = setInterval(() => {
      useOverlayStore.getState().cleanupExpiredAlerts();
    }, 500);
    return () => clearInterval(timer);
  }, []);
}

export function useOverlaySession({
  sessionId,
  volume,
  muted,
  realtime = realtimeClient,
  audioContextFactory,
}: UseOverlaySessionOptions) {
  const projection = useOverlayStore((s) => s.projection);
  const config = useOverlayStore((s) => s.config);
  const gameId = useOverlayStore((s) => s.gameId);
  const connected = useOverlayStore((s) => s.connected);
  const alerts = useOverlayStore((s) => s.alerts);
  const celebration = useOverlayStore((s) => s.celebration);

  const { audioEngineRef, isAudioSuspended, resumeAudio } = useOverlayAudio(
    volume,
    muted,
    audioContextFactory,
  );

  useOverlayRealtime(sessionId, realtime, audioEngineRef);

  const { data: session } = useQuery<GameSession>({
    queryKey: ['session', sessionId],
    queryFn: () => {
      if (!sessionId) throw new Error('No session ID');
      return getSession(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (session) {
      useOverlayStore.getState().setGameId(session.gameId);
      if (session.config && 'teamA' in session.config) {
        useOverlayStore.getState().setConfig(session.config as AxBConfig);
      }
    }
  }, [session]);

  return {
    projection,
    config,
    gameId,
    connected,
    alerts,
    celebration,
    isAudioSuspended,
    resumeAudio,
  };
}
