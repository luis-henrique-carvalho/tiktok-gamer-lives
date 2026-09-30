export interface HealthResponseDto {
  readonly status: 'ok' | 'degraded';
  readonly timestamp: number;
  readonly uptime: number;
  readonly uptimeSeconds: number;
}
