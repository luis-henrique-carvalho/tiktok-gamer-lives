import type { TikTokLiveCaptureAdapter } from '../../tiktok/tiktok-capture.adapter.js';
import { tiktokConnectSchema } from '../dtos/ingress-http.dto.js';

export class TikTokController {
  constructor(private readonly tiktokAdapter: TikTokLiveCaptureAdapter) {}

  async connect(body: unknown) {
    const input = tiktokConnectSchema.parse(body);
    await this.tiktokAdapter.connect(input.username, input.sessionId);

    return {
      status: this.tiktokAdapter.getStatus(),
      username: this.tiktokAdapter.getUsername(),
      sessionId: this.tiktokAdapter.getSessionId(),
    };
  }

  async disconnect() {
    await this.tiktokAdapter.disconnect();

    return {
      status: this.tiktokAdapter.getStatus(),
    };
  }

  getStatus() {
    return {
      status: this.tiktokAdapter.getStatus(),
      username: this.tiktokAdapter.getUsername(),
      sessionId: this.tiktokAdapter.getSessionId(),
    };
  }
}
