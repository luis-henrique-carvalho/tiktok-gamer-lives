import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { errorHandler } from '../../../../../common/infrastructure/http/error-handler.js';
import { simulatorRoutes } from '../routes/simulator.routes.js';
import { tiktokRoutes } from '../routes/tiktok.routes.js';
import { SimulatorController } from '../controllers/simulator.controller.js';
import { TikTokController } from '../controllers/tiktok.controller.js';
import type { SimulatorCaptureAdapter } from '../../simulator/simulator-capture.adapter.js';
import type { TikTokLiveCaptureAdapter } from '../../tiktok/tiktok-capture.adapter.js';

describe('Ingress HTTP Routes (Simulator & TikTok)', () => {
  let app: FastifyInstance;
  let mockSimulatorAdapter: SimulatorCaptureAdapter;
  let mockTikTokAdapter: TikTokLiveCaptureAdapter;
  let simulatorController: SimulatorController;
  let tiktokController: TikTokController;

  beforeEach(async () => {
    mockSimulatorAdapter = {
      start: vi.fn(),
      stop: vi.fn(),
      triggerBurst: vi.fn().mockResolvedValue({ totalGenerated: 200 }),
      isRunning: vi.fn().mockReturnValue(true),
      getCurrentSessionId: vi.fn().mockReturnValue('session-sim-1'),
    } as unknown as SimulatorCaptureAdapter;

    mockTikTokAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue('CONNECTED'),
      getUsername: vi.fn().mockReturnValue('streamer123'),
      getSessionId: vi.fn().mockReturnValue('session-tt-1'),
    } as unknown as TikTokLiveCaptureAdapter;

    simulatorController = new SimulatorController(mockSimulatorAdapter);
    tiktokController = new TikTokController(mockTikTokAdapter);

    app = Fastify();
    app.setErrorHandler(errorHandler);
    await app.register(simulatorRoutes(simulatorController));
    await app.register(tiktokRoutes(tiktokController));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Simulator Routes (/api/simulator)', () => {
    it('POST /api/simulator/start - starts continuous simulation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulator/start',
        payload: {
          sessionId: 'session-sim-1',
          eventsPerSecond: 10,
          distribution: { commentsRatio: 0.8, giftsRatio: 0.2 },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: 'RUNNING',
          sessionId: 'session-sim-1',
        }),
      );
      expect(mockSimulatorAdapter.start).toHaveBeenCalledWith('session-sim-1', {
        eventsPerSecond: 10,
        distribution: { commentsRatio: 0.8, giftsRatio: 0.2 },
      });
    });

    it('POST /api/simulator/stop - stops simulation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulator/stop',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: 'STOPPED',
        }),
      );
      expect(mockSimulatorAdapter.stop).toHaveBeenCalled();
    });

    it('POST /api/simulator/burst - triggers burst mode CA-11', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulator/burst',
        payload: {
          sessionId: 'session-sim-1',
          totalEvents: 200,
          eventsPerSecond: 200,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
          totalGenerated: 200,
        }),
      );
      expect(mockSimulatorAdapter.triggerBurst).toHaveBeenCalledWith(
        'session-sim-1',
        {
          totalEvents: 200,
          eventsPerSecond: 200,
        },
      );
    });
  });

  describe('TikTok Routes (/api/tiktok)', () => {
    it('POST /api/tiktok/connect - connects to live stream', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tiktok/connect',
        payload: {
          username: 'streamer123',
          sessionId: 'session-tt-1',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: 'CONNECTED',
          username: 'streamer123',
          sessionId: 'session-tt-1',
        }),
      );
      expect(mockTikTokAdapter.connect).toHaveBeenCalledWith(
        'streamer123',
        'session-tt-1',
      );
    });

    it('POST /api/tiktok/disconnect - disconnects live stream', async () => {
      vi.mocked(mockTikTokAdapter.getStatus).mockReturnValue('DISCONNECTED');
      vi.mocked(mockTikTokAdapter.getUsername).mockReturnValue(null);
      vi.mocked(mockTikTokAdapter.getSessionId).mockReturnValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tiktok/disconnect',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: 'DISCONNECTED',
        }),
      );
      expect(mockTikTokAdapter.disconnect).toHaveBeenCalled();
    });

    it('GET /api/tiktok/status - returns current connection status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tiktok/status',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          status: 'CONNECTED',
          username: 'streamer123',
          sessionId: 'session-tt-1',
        }),
      );
    });
  });
});
