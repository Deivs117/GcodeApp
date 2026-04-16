'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList,
  Plus,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Pencil,
} from 'lucide-react'
import SessionForm, { type SessionFormData } from '@/components/cnc-reports/SessionForm'
import UpdateSessionModal from '@/components/cnc-reports/UpdateSessionModal'
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  listClients,
  listPcbVersions,
  downloadPdf,
  type MachiningSession,
  type Client,
  type PcbVersion,
} from '@/services/cncApi'

const STATUS_CONFIG = {
  pending: { label: 'Por empezar', color: 'bg-slate-700 text-slate-300', Icon: Clock },
  running: { label: 'Maquinando', color: 'bg-amber-900/40 text-amber-300', Icon: Loader2 },
  failed:  { label: 'Fallo',      color: 'bg-red-900/40 text-red-300',    Icon: AlertTriangle },
  done:    { label: 'Finalizado', color: 'bg-emerald-900/40 text-emerald-300', Icon: CheckCircle2 },
} as const

type Status = keyof typeof STATUS_CONFIG

function fmtSec(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`
}

export default function CncReportsPage() {
  const [sessions, setSessions] = useState<MachiningSession[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [pcbVersions, setPcbVersions] = useState<PcbVersion[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editSession, setEditSession] = useState<MachiningSession | null>(null)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, v] = await Promise.all([
        listSessions(),
        listClients(),
        listPcbVersions(),
      ])
      setSessions(s)
      setClients(c)
      setPcbVersions(v)
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCreateSession = async (data: SessionFormData) => {
    await createSession({
      clientId: data.clientId,
      pcbVersionId: data.pcbVersionId,
      units: data.units,
      status: data.status,
      tracksTimeSec: data.tracksTimeSec,
      drillsTimeSec: data.drillsTimeSec,
      cutoutTimeSec: data.cutoutTimeSec,
      failureNotes: data.failureNotes,
    })
    setFormOpen(false)
    await fetchAll()
  }

  const handleUpdateSession = async (id: string, payload: {
    status: string
    tracksTimeSec: number
    drillsTimeSec: number
    cutoutTimeSec: number
    failureNotes: string
    units: number
  }) => {
    await updateSession(id, payload)
    setEditSession(null)
    await fetchAll()
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this session?')) return
    await deleteSession(id)
    await fetchAll()
  }

  const handleDownloadPdf = async (session: MachiningSession) => {
    setPdfLoading(session.id)
    try {
      await downloadPdf(session.id, session)
    } finally {
      setPdfLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="text-sky-400" size={28} />
            <h1 className="text-2xl font-bold text-white">Machining Sessions</h1>
          </div>
          <p className="text-slate-400 text-sm">Track PCB machining sessions per client/order and export PDF reports</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          New Session
        </button>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-6 flex items-center gap-2 bg-amber-900/20 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm">
          <AlertCircle size={16} />
          <span>{loadError} — Make sure the backend and database are running.</span>
        </div>
      )}

      {/* Summary stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(['pending', 'running', 'failed', 'done'] as Status[]).map((st) => {
            const cfg = STATUS_CONFIG[st]
            const count = sessions.filter((s) => s.status === st).length
            return (
              <div key={st} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                  {cfg.label}
                </p>
                <p className="text-white text-2xl font-bold">{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Session table */}
      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No sessions yet</p>
          <p className="text-slate-600 text-sm mt-1">Click &ldquo;New Session&rdquo; to get started</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Client</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Order / Version</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Units</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Tracks</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Drills</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Cutout</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Date</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, idx) => {
                  const statusCfg = STATUS_CONFIG[session.status as Status] ?? STATUS_CONFIG.pending
                  const { Icon } = statusCfg
                  return (
                    <tr
                      key={session.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-slate-800/30'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-200 font-medium">
                        {session.clientName ?? <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {session.pcbVersion
                          ? <span className="bg-slate-700 text-sky-300 px-2 py-0.5 rounded text-xs font-mono">{session.pcbVersion}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{session.units}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          <Icon size={11} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {fmtSec(session.tracksTimeSec)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {fmtSec(session.drillsTimeSec)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {fmtSec(session.cutoutTimeSec)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditSession(session)}
                            title="Update session"
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(session)}
                            disabled={pdfLoading === session.id}
                            title="Download PDF report"
                            className="p-1.5 rounded-lg bg-sky-900/30 hover:bg-sky-900/50 text-sky-400 transition-colors disabled:opacity-50"
                          >
                            {pdfLoading === session.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Download size={13} />
                            }
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            title="Delete session"
                            className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create session modal */}
      <SessionForm
        open={formOpen}
        clients={clients}
        pcbVersions={pcbVersions}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateSession}
      />

      {/* Update session modal */}
      {editSession && (
        <UpdateSessionModal
          session={editSession}
          onClose={() => setEditSession(null)}
          onSubmit={(payload) => handleUpdateSession(editSession.id, payload)}
        />
      )}
    </div>
  )
}
