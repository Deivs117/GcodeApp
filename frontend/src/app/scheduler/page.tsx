'use client'
import { useState, useCallback, useEffect } from 'react'
import { Calendar, Plus, Link2, AlertCircle } from 'lucide-react'
import moment from 'moment'
import dynamic from 'next/dynamic'
import EventModal, { type EventFormData } from '@/components/scheduler/EventModal'
import {
  listMeetings,
  createMeeting,
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
  const [slotStart, setSlotStart] = useState<string>('')
  const [slotEnd, setSlotEnd] = useState<string>('')
  const [googleToken, setGoogleToken] = useState<string>('')

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
    setSlotStart(moment(start).format('YYYY-MM-DDTHH:mm'))
    setSlotEnd(moment(end).format('YYYY-MM-DDTHH:mm'))
    setModalOpen(true)
  }, [])

  const handleCreateMeeting = async (data: EventFormData) => {
    const attendees = data.attendees
      ? data.attendees.split(',').map((e) => e.trim()).filter(Boolean)
      : []

    await createMeeting(
      {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        attendees,
      },
      googleToken || undefined
    )
    setModalOpen(false)
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
            onClick={handleGoogleConnect}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Link2 size={15} />
            Connect Google
          </button>
          <button
            onClick={() => {
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
      />

      {/* Create event modal */}
      <EventModal
        open={modalOpen}
        initialStart={slotStart}
        initialEnd={slotEnd}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateMeeting}
      />
    </div>
  )
}
