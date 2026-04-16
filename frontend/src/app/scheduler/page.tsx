'use client'
import { useState, useCallback, useEffect } from 'react'
import { Calendar, Plus, Link2, AlertCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import moment from 'moment'
import dynamic from 'next/dynamic'
import EventModal, { type EventFormData } from '@/components/scheduler/EventModal'
import {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getAuthUrl,
  type Meeting,
} from '@/services/schedulerApi'

// CalendarView uses react-big-calendar which requires a browser environment
const CalendarView = dynamic(
  () => import('@/components/scheduler/CalendarView'),
  { ssr: false }
)

export default function SchedulerPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [slotStart, setSlotStart] = useState<string>('')
  const [slotEnd, setSlotEnd] = useState<string>('')
  const [googleToken, setGoogleToken] = useState<string>('')
  const [guideOpen, setGuideOpen] = useState(false)

  // Load meetings from backend
  const fetchMeetings = useCallback(async () => {
    try {
      const data = await listMeetings()
      setMeetings(data)
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load meetings')
    }
  }, [])

  useEffect(() => {
    fetchMeetings()
    // Check for Google OAuth token stored in localStorage
    const stored = localStorage.getItem('googleToken')
    if (stored) setGoogleToken(stored)
  }, [fetchMeetings])

  // Open event modal pre-filled with selected slot
  const handleSlotSelect = useCallback((start: Date, end: Date) => {
    setEditingMeeting(null)
    setSlotStart(moment(start).format('YYYY-MM-DDTHH:mm'))
    setSlotEnd(moment(end).format('YYYY-MM-DDTHH:mm'))
    setModalOpen(true)
  }, [])

  const handleOpenEdit = useCallback((meeting: Meeting) => {
    setEditingMeeting(meeting)
    setModalOpen(true)
  }, [])

  const handleSubmitMeeting = async (data: EventFormData) => {
    const attendees = data.attendees
      ? data.attendees.split(',').map((e) => e.trim()).filter(Boolean)
      : []
    const payload = {
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      attendees,
    }

    if (editingMeeting) {
      await updateMeeting(editingMeeting.id, payload, googleToken || undefined)
    } else {
      await createMeeting(payload, googleToken || undefined)
    }
    setModalOpen(false)
    setEditingMeeting(null)
    await fetchMeetings()
  }

  const handleDeleteMeeting = async (id: string) => {
    await deleteMeeting(id)
    await fetchMeetings()
  }

  const handleGoogleConnect = async () => {
    try {
      const { url } = await getAuthUrl()
      window.open(url, '_blank', 'width=500,height=600')
    } catch {
      alert('Google OAuth not configured on the backend. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL.')
    }
  }

  // Build initialData for edit mode
  const editInitialData: EventFormData | undefined = editingMeeting
    ? {
        title: editingMeeting.title,
        description: editingMeeting.description,
        startTime: moment(editingMeeting.startTime).format('YYYY-MM-DDTHH:mm'),
        endTime: moment(editingMeeting.endTime).format('YYYY-MM-DDTHH:mm'),
        attendees: (editingMeeting.attendees ?? []).join(', '),
      }
    : undefined

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="text-sky-400" size={28} />
            <h1 className="text-2xl font-bold text-white">Flux Scheduler</h1>
          </div>
          <p className="text-slate-400 text-sm">Manage meetings and sync with Google Calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGuideOpen((v) => !v)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <BookOpen size={15} />
            Setup Guide
            {guideOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={handleGoogleConnect}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Link2 size={15} />
            Connect Google
          </button>
          <button
            onClick={() => {
              setEditingMeeting(null)
              setSlotStart(moment().format('YYYY-MM-DDTHH:mm'))
              setSlotEnd(moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'))
              setModalOpen(true)
            }}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={15} />
            New Meeting
          </button>
        </div>
      </div>

      {/* Google OAuth Setup Guide */}
      {guideOpen && (
        <div className="mb-6 bg-slate-800/80 border border-slate-700 rounded-xl p-6 text-sm text-slate-300">
          <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-sky-400" />
            Google Calendar Integration — Setup Guide
          </h2>

          <div className="space-y-4">
            <section>
              <h3 className="text-slate-200 font-medium mb-1">What are Environment Variables?</h3>
              <p className="text-slate-400 leading-relaxed">
                Environment variables are configuration values stored <em>outside</em> your source code — typically in a
                <code className="bg-slate-700 text-sky-300 px-1 rounded mx-1">.env</code> file at the project root.
                They keep sensitive credentials (like API keys and secrets) out of version control.
              </p>
            </section>

            <section>
              <h3 className="text-slate-200 font-medium mb-2">Step 1 — Create a Google Cloud Project</h3>
              <ol className="list-decimal list-inside text-slate-400 space-y-1 leading-relaxed">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">console.cloud.google.com</a> and create a new project.</li>
                <li>Navigate to <strong>APIs &amp; Services → Library</strong> and enable <strong>Google Calendar API</strong>.</li>
                <li>Go to <strong>APIs &amp; Services → OAuth consent screen</strong>. Set app type to <em>Internal</em> (for your organization) and fill in required fields.</li>
                <li>Go to <strong>APIs &amp; Services → Credentials → Create Credentials → OAuth 2.0 Client ID</strong>.</li>
                <li>Choose <em>Web application</em>. Under <strong>Authorized redirect URIs</strong>, add your backend callback URL.</li>
              </ol>
            </section>

            <section>
              <h3 className="text-slate-200 font-medium mb-2">Step 2 — Configure Environment Variables</h3>
              <p className="text-slate-400 mb-2">Create or update a <code className="bg-slate-700 text-sky-300 px-1 rounded">.env</code> file in the project root:</p>
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">{`# Google OAuth2 credentials (from Cloud Console → Credentials)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here

# Must match exactly what you added as an Authorized Redirect URI in Google Cloud
GOOGLE_REDIRECT_URL=http://localhost:8080/api/scheduler/oauth-callback
# For production: https://yourdomain.com/api/scheduler/oauth-callback`}</pre>
            </section>

            <section>
              <h3 className="text-slate-200 font-medium mb-2">Step 3 — Authenticate</h3>
              <ol className="list-decimal list-inside text-slate-400 space-y-1 leading-relaxed">
                <li>Restart the backend after setting the env vars.</li>
                <li>Click <strong>Connect Google</strong> above — a Google consent window will open.</li>
                <li>After approving, the backend returns an OAuth2 token.</li>
                <li>Paste the token JSON into the field below to enable automatic calendar syncing.</li>
              </ol>
            </section>

            <section>
              <h3 className="text-slate-200 font-medium mb-1">Variable Reference</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60">
                    <th className="text-left text-slate-400 font-medium px-3 py-2 border border-slate-700">Variable</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2 border border-slate-700">Required</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2 border border-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['GOOGLE_CLIENT_ID', 'Yes', 'OAuth2 Client ID from Google Cloud Console'],
                    ['GOOGLE_CLIENT_SECRET', 'Yes', 'OAuth2 Client Secret from Google Cloud Console'],
                    ['GOOGLE_REDIRECT_URL', 'Yes', 'Callback URI — must match exactly in Google Cloud settings'],
                  ].map(([v, r, d]) => (
                    <tr key={v} className="border-b border-slate-700/50">
                      <td className="px-3 py-2 border border-slate-700 font-mono text-sky-300">{v}</td>
                      <td className="px-3 py-2 border border-slate-700 text-amber-400">{r}</td>
                      <td className="px-3 py-2 border border-slate-700 text-slate-400">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}

      {/* Error */}
      {loadError && (
        <div className="mb-6 flex items-center gap-2 bg-amber-900/20 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm">
          <AlertCircle size={16} />
          <span>{loadError} — Make sure the backend and database are running.</span>
        </div>
      )}

      {/* Google token input (simplified UI for demo) */}
      {!googleToken && (
        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400">
          <p className="font-medium text-slate-300 mb-1">Google Calendar Sync (optional)</p>
          <p className="mb-2">
            Click <strong>Connect Google</strong> above to authenticate. After approving, paste the
            token JSON below to enable automatic Google Calendar invitations.
          </p>
          <input
            placeholder='Paste OAuth token JSON here…'
            value={googleToken}
            onChange={(e) => {
              setGoogleToken(e.target.value)
              localStorage.setItem('googleToken', e.target.value)
            }}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      )}

      {/* Calendar */}
      <CalendarView
        meetings={meetings}
        onSlotSelect={handleSlotSelect}
        onDeleteMeeting={handleDeleteMeeting}
        onEditMeeting={handleOpenEdit}
      />

      {/* Create / Edit event modal */}
      <EventModal
        open={modalOpen}
        initialStart={editingMeeting ? undefined : slotStart}
        initialEnd={editingMeeting ? undefined : slotEnd}
        initialData={editInitialData}
        editMode={!!editingMeeting}
        onClose={() => { setModalOpen(false); setEditingMeeting(null) }}
        onSubmit={handleSubmitMeeting}
      />
    </div>
  )
}
