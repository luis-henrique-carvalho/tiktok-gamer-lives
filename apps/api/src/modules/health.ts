export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: number;
  uptimeSeconds: number;
}

export function checkHealth(
  uptimeSeconds: number = process.uptime(),
): HealthStatus {
  return {
    status: 'ok',
    timestamp: Date.now(),
    uptimeSeconds: Math.floor(uptimeSeconds),
  };
}
