'use client'
import { useCallback, useMemo, useState } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Trash2, Pencil } from 'lucide-react'
import type { Meeting } from '@/services/schedulerApi'

const localizer = momentLocalizer(moment)

interface CalendarViewProps {
  meetings: Meeting[]
  onSlotSelect: (start: Date, end: Date) => void
  onDeleteMeeting: (id: string) => void
  onEditMeeting: (meeting: Meeting) => void
}

export default function CalendarView({
  meetings,
  onSlotSelect,
  onDeleteMeeting,
  onEditMeeting,
}: CalendarViewProps) {
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Meeting | null>(null)

  const events = useMemo(
    () =>
      meetings.map((m) => ({
        id: m.id,
        title: m.title,
        start: new Date(m.startTime),
        end: new Date(m.endTime),
        resource: m,
      })),
    [meetings]
  )

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      onSlotSelect(slotInfo.start, slotInfo.end)
    },
    [onSlotSelect]
  )

  const handleSelectEvent = useCallback((event: { resource: Meeting }) => {
    setSelectedEvent(event.resource)
  }, [])

  // Style today's date column
  const dayPropGetter = useCallback((d: Date) => {
    const isToday = moment(d).isSame(moment(), 'day')
    return isToday
      ? { style: { backgroundColor: 'rgba(14, 165, 233, 0.08)' } }
      : {}
  }, [])

  // Style events
  const eventPropGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: '#0ea5e9',
        borderRadius: '6px',
        border: 'none',
        color: '#fff',
        fontSize: '12px',
      },
    }
  }, [])

  return (
    <div className="flex gap-4">
      {/* Calendar */}
      <div className="flex-1 bg-slate-800 rounded-xl p-4 overflow-hidden">
        <style>{calendarStyles}</style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventPropGetter}
          style={{ height: 600 }}
          views={['month', 'week', 'day']}
          defaultView="week"
          popup
        />
      </div>

      {/* Event detail panel */}
      {selectedEvent && (
        <div className="w-72 bg-slate-800 rounded-xl p-5 border border-slate-700 self-start">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-white font-semibold text-base">{selectedEvent.title}</h3>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>

          {selectedEvent.description && (
            <p className="text-slate-400 text-sm mb-3">{selectedEvent.description}</p>
          )}

          <div className="space-y-2 text-sm text-slate-400 mb-4">
            <p>
              <span className="text-slate-300 font-medium">Start: </span>
              {moment(selectedEvent.startTime).format('ddd D MMM, HH:mm')}
            </p>
            <p>
              <span className="text-slate-300 font-medium">End: </span>
              {moment(selectedEvent.endTime).format('ddd D MMM, HH:mm')}
            </p>
            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <span className="text-slate-300 font-medium">Attendees:</span>
                <ul className="mt-1 space-y-0.5">
                  {selectedEvent.attendees.map((a) => (
                    <li key={a} className="text-slate-400 text-xs truncate">
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedEvent.googleEventId && (
              <p className="text-emerald-400 text-xs">✓ Synced to Google Calendar</p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                onEditMeeting(selectedEvent)
                setSelectedEvent(null)
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-lg py-2 text-sm transition-colors"
            >
              <Pencil size={14} />
              Edit Meeting
            </button>
            <button
              onClick={() => {
                onDeleteMeeting(selectedEvent.id)
                setSelectedEvent(null)
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 rounded-lg py-2 text-sm transition-colors"
            >
              <Trash2 size={14} />
              Delete Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Dark-mode overrides for react-big-calendar
const calendarStyles = `
  .rbc-calendar { background: transparent; color: #cbd5e1; }
  .rbc-header { background: #1e293b; border-color: #334155; color: #94a3b8; font-size: 12px; padding: 6px 0; }
  .rbc-time-view, .rbc-month-view { border-color: #334155; }
  .rbc-time-content { border-color: #334155; }
  .rbc-time-header-content { border-color: #334155; }
  .rbc-timeslot-group { border-color: #1e293b; }
  .rbc-time-slot { color: #475569; font-size: 11px; }
  .rbc-day-slot .rbc-time-slot { border-top-color: #1e293b; }
  .rbc-current-time-indicator { background-color: #0ea5e9; }
  .rbc-today { background-color: rgba(14,165,233,0.07) !important; }
  .rbc-off-range-bg { background: #0f172a; }
  .rbc-date-cell { color: #94a3b8; padding: 4px 8px; }
  .rbc-date-cell.rbc-now { color: #38bdf8; font-weight: 700; }
  .rbc-toolbar button { color: #94a3b8; border-color: #334155; background: #1e293b; }
  .rbc-toolbar button:hover, .rbc-toolbar button.rbc-active { background: #0ea5e9; color: #fff; border-color: #0ea5e9; }
  .rbc-toolbar-label { color: #e2e8f0; font-weight: 600; }
  .rbc-show-more { color: #0ea5e9; background: transparent; }
  .rbc-event:focus { outline: 2px solid #0ea5e9; }
`
