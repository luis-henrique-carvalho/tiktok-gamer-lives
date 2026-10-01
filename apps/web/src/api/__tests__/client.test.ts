import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSession,
  getSession,
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  getAuditSession,
  connectTikTok,
  disconnectTikTok,
  getTikTokStatus,
  startSimulator,
  stopSimulator,
  burstSimulator,
  ApiError,
} from '../client';

describe('API Client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('handles successful createSession POST request', async () => {
    const mockSession = {
      id: 'sess-1',
      title: 'Test Session',
      status: 'CONFIGURING',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    });

    const result = await createSession({
      gameId: 'axb',
      operatorId: 'op-1',
      title: 'Test Session',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'axb',
        operatorId: 'op-1',
        title: 'Test Session',
      }),
    });
    expect(result).toEqual(mockSession);
  });

  it('throws ApiError with message and status when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid payload' }),
    });

    await expect(
      createSession({
        gameId: 'axb',
        operatorId: 'op-1',
        title: '',
      }),
    ).rejects.toThrow(ApiError);
  });

  it('handles getSession GET request', async () => {
    const mockSession = { id: 'sess-1', title: 'Test' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    });

    const result = await getSession('sess-1');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/sessions/sess-1', {
      method: 'GET',
      headers: {},
    });
    expect(result).toEqual(mockSession);
  });

  it('handles session lifecycle actions: start, pause, resume, end, audit', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success' }),
    });

    await startSession('sess-1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/sessions/sess-1/start',
      {
        method: 'POST',
        headers: {},
      },
    );

    await pauseSession('sess-1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/sessions/sess-1/pause',
      {
        method: 'POST',
        headers: {},
      },
    );

    await resumeSession('sess-1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/sessions/sess-1/resume',
      {
        method: 'POST',
        headers: {},
      },
    );

    await endSession('sess-1');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/sessions/sess-1/end', {
      method: 'POST',
      headers: {},
    });

    await getAuditSession('sess-1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/sessions/sess-1/audit',
      {
        method: 'GET',
        headers: {},
      },
    );
  });

  it('handles TikTok endpoints: connect, disconnect, getStatus', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'connected', username: 'streamer1' }),
    });

    await connectTikTok({ username: 'streamer1', sessionId: 'sess-1' });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tiktok/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'streamer1', sessionId: 'sess-1' }),
    });

    await disconnectTikTok();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tiktok/disconnect', {
      method: 'POST',
      headers: {},
    });

    await getTikTokStatus();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tiktok/status', {
      method: 'GET',
      headers: {},
    });
  });

  it('handles Simulator endpoints: start, stop, burst', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    await startSimulator({ sessionId: 'sess-1', eventsPerSecond: 10 });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/simulator/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'sess-1', eventsPerSecond: 10 }),
    });

    await stopSimulator();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/simulator/stop', {
      method: 'POST',
      headers: {},
    });

    await burstSimulator({
      sessionId: 'sess-1',
      totalEvents: 200,
      eventsPerSecond: 200,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/simulator/burst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'sess-1',
        totalEvents: 200,
        eventsPerSecond: 200,
      }),
    });
  });

  it('handles fallback error text when JSON parsing fails in error response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(getSession('sess-err')).rejects.toThrow(
      'Internal Server Error',
    );
  });
});
