export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: number;
  uptime: number;
  uptimeSeconds: number;
}

export function checkHealth(
  uptimeSeconds: number = process.uptime(),
): HealthStatus {
  const roundedUptime = Math.floor(uptimeSeconds);
  return {
    status: 'ok',
    timestamp: Date.now(),
    uptime: roundedUptime,
    uptimeSeconds: roundedUptime,
  };
}
