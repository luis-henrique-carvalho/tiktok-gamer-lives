import type { HealthResponseDto } from '../dtos/health.dto.js';

export function checkHealth(
  uptimeSeconds: number = process.uptime(),
): HealthResponseDto {
  const roundedUptime = Math.floor(uptimeSeconds);
  return {
    status: 'ok',
    timestamp: Date.now(),
    uptime: roundedUptime,
    uptimeSeconds: roundedUptime,
  };
}
