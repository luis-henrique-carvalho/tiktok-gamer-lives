import type {
  CreateSessionRequest,
  GameSession,
  ResumeSessionResponse,
  AuditSessionResponse,
  TikTokConnectRequest,
  TikTokStatusResponse,
  SimulatorStartRequest,
  SimulatorStartResponse,
  SimulatorStopResponse,
  SimulatorBurstRequest,
  SimulatorBurstResponse,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };

  const isMutation =
    options?.method === 'POST' ||
    options?.method === 'PUT' ||
    options?.method === 'PATCH';

  if (isMutation && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: isMutation && options?.body === undefined ? '{}' : options?.body,
  });

  if (!response.ok) {
    let errorData: unknown;
    let errorMessage = response.statusText || 'Request failed';
    try {
      errorData = await response.json();
      if (
        typeof errorData === 'object' &&
        errorData !== null &&
        'message' in errorData &&
        typeof (errorData as { message: unknown }).message === 'string'
      ) {
        errorMessage = (errorData as { message: string }).message;
      }
    } catch {
      // Not a JSON response
    }
    throw new ApiError(errorMessage, response.status, errorData);
  }

  return (await response.json()) as T;
}

// Sessions
export async function createSession(
  data: CreateSessionRequest,
): Promise<GameSession> {
  return request<GameSession>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSession(id: string): Promise<GameSession> {
  return request<GameSession>(`/api/sessions/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function startSession(id: string): Promise<GameSession> {
  return request<GameSession>(`/api/sessions/${encodeURIComponent(id)}/start`, {
    method: 'POST',
  });
}

export async function pauseSession(id: string): Promise<GameSession> {
  return request<GameSession>(`/api/sessions/${encodeURIComponent(id)}/pause`, {
    method: 'POST',
  });
}

export async function resumeSession(
  id: string,
): Promise<ResumeSessionResponse> {
  return request<ResumeSessionResponse>(
    `/api/sessions/${encodeURIComponent(id)}/resume`,
    {
      method: 'POST',
    },
  );
}

export async function endSession(id: string): Promise<GameSession> {
  return request<GameSession>(`/api/sessions/${encodeURIComponent(id)}/end`, {
    method: 'POST',
  });
}

export async function getAuditSession(
  id: string,
): Promise<AuditSessionResponse> {
  return request<AuditSessionResponse>(
    `/api/sessions/${encodeURIComponent(id)}/audit`,
    {
      method: 'GET',
    },
  );
}

// TikTok Ingress
export async function connectTikTok(
  data: TikTokConnectRequest,
): Promise<TikTokStatusResponse> {
  return request<TikTokStatusResponse>('/api/tiktok/connect', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function disconnectTikTok(): Promise<{ status: string }> {
  return request<{ status: string }>('/api/tiktok/disconnect', {
    method: 'POST',
  });
}

export async function getTikTokStatus(): Promise<TikTokStatusResponse> {
  return request<TikTokStatusResponse>('/api/tiktok/status', {
    method: 'GET',
  });
}

// Simulator Ingress
export async function startSimulator(
  data: SimulatorStartRequest,
): Promise<SimulatorStartResponse> {
  return request<SimulatorStartResponse>('/api/simulator/start', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function stopSimulator(): Promise<SimulatorStopResponse> {
  return request<SimulatorStopResponse>('/api/simulator/stop', {
    method: 'POST',
  });
}

export async function burstSimulator(
  data: SimulatorBurstRequest,
): Promise<SimulatorBurstResponse> {
  return request<SimulatorBurstResponse>('/api/simulator/burst', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ManualActionResult {
  success: boolean;
  sessionId?: string;
  team?: 'A' | 'B';
  units?: number;
  status?: string;
  reason?: string;
  message?: string;
  result?: {
    success?: boolean;
    status?: string;
    reason?: string;
  };
}

export async function sendManualVote(params: {
  sessionId?: string;
  team: 'A' | 'B';
  userId?: string;
  userName?: string;
}): Promise<ManualActionResult> {
  return request<ManualActionResult>('/api/simulator/vote', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function sendManualGift(params: {
  sessionId?: string;
  team: 'A' | 'B';
  units?: number;
  userId?: string;
  userName?: string;
  resourceKey?: string;
}): Promise<ManualActionResult> {
  return request<ManualActionResult>('/api/simulator/gift', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function clearPendingContributions(
  sessionId: string,
): Promise<{ success: boolean; sessionId: string }> {
  return request<{ success: boolean; sessionId: string }>(
    '/api/simulator/clear-pending',
    {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    },
  );
}
