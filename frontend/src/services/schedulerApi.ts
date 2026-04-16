const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface Meeting {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  attendees: string[] | null
  googleEventId?: string
  createdAt: string
}

export interface CreateMeetingPayload {
  title: string
  description: string
  startTime: string
  endTime: string
  attendees: string[]
}

async function request<T>(path: string, options?: RequestInit, googleToken?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (googleToken) {
    headers['X-Google-Token'] = googleToken
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function listMeetings(): Promise<Meeting[]> {
  return request<Meeting[]>('/api/scheduler/meetings')
}

export async function createMeeting(
  payload: CreateMeetingPayload,
  googleToken?: string
): Promise<{ id: string; googleEventId?: string }> {
  return request(
    '/api/scheduler/meetings',
    { method: 'POST', body: JSON.stringify(payload) },
    googleToken
  )
}

export async function deleteMeeting(id: string): Promise<void> {
  await request(`/api/scheduler/meetings/${id}`, { method: 'DELETE' })
}

export async function updateMeeting(
  id: string,
  payload: CreateMeetingPayload,
  googleToken?: string
): Promise<void> {
  await request(
    `/api/scheduler/meetings/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    googleToken
  )
}

export async function getAuthUrl(): Promise<{ url: string }> {
  return request<{ url: string }>('/api/scheduler/auth-url')
}
