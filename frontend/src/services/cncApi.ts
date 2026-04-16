const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface Client {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface PcbVersion {
  id: string
  version: string
  clientId: string
  createdAt: string
}

export interface MachiningSession {
  id: string
  clientId: string | null
  clientName: string | null
  pcbVersionId: string | null
  pcbVersion: string | null
  units: number
  status: 'pending' | 'running' | 'failed' | 'done'
  tracksTimeSec: number
  drillsTimeSec: number
  cutoutTimeSec: number
  failureNotes: string
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

export interface UpdateSessionPayload {
  status: string
  tracksTimeSec: number
  drillsTimeSec: number
  cutoutTimeSec: number
  failureNotes: string
  units: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function listClients(): Promise<Client[]> {
  return request<Client[]>('/api/cnc/clients')
}

export async function listPcbVersions(clientId?: string): Promise<PcbVersion[]> {
  const query = clientId ? `?clientId=${clientId}` : ''
  return request<PcbVersion[]>(`/api/cnc/pcb-versions${query}`)
}

export async function listSessions(): Promise<MachiningSession[]> {
  return request<MachiningSession[]>('/api/cnc/sessions')
}

export async function createSession(
  payload: Omit<MachiningSession, 'id' | 'clientName' | 'pcbVersion' | 'startedAt' | 'finishedAt' | 'createdAt'>
): Promise<{ id: string }> {
  return request('/api/cnc/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSession(
  id: string,
  payload: UpdateSessionPayload
): Promise<void> {
  await request(`/api/cnc/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/api/cnc/sessions/${id}`, { method: 'DELETE' })
}

export async function downloadPdf(id: string, session: MachiningSession): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cnc/sessions/${id}/pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'PDF download failed')
  }

  const blob = await res.blob()
  const date = new Date(session.createdAt).toISOString().slice(0, 10).replace(/-/g, '')
  const client = (session.clientName ?? 'Unknown').replace(/[^a-zA-Z0-9]/g, '_')
  const version = (session.pcbVersion ?? 'v0').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `${date}_${client}_${version}.pdf`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
