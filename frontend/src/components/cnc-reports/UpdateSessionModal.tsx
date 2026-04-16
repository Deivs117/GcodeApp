'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, ClipboardList } from 'lucide-react'
import type { MachiningSession } from '@/services/cncApi'

interface UpdatePayload {
  status: string
  tracksTimeSec: number
  drillsTimeSec: number
  cutoutTimeSec: number
  failureNotes: string
  units: number
}

interface UpdateSessionModalProps {
  session: MachiningSession
  onClose: () => void
  onSubmit: (payload: UpdatePayload) => Promise<void>
}

const statusOptions = [
  { value: 'pending', label: 'Por empezar' },
  { value: 'running', label: 'Maquinando' },
  { value: 'failed',  label: 'Fallo' },
  { value: 'done',    label: 'Finalizado' },
]

export default function UpdateSessionModal({ session, onClose, onSubmit }: UpdateSessionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePayload>()

  const status = watch('status')

  useEffect(() => {
    reset({
      status: session.status,
      tracksTimeSec: session.tracksTimeSec,
      drillsTimeSec: session.drillsTimeSec,
      cutoutTimeSec: session.cutoutTimeSec,
      failureNotes: session.failureNotes,
      units: session.units,
    })
  }, [session, reset])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-sky-400" size={20} />
            <h2 className="text-white font-semibold text-lg">Update Session</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Status + Units */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">Status</label>
              <select
                {...register('status')}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  status === 'done'
                    ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                    : status === 'failed'
                    ? 'bg-red-900/40 border-red-700 text-red-300'
                    : status === 'running'
                    ? 'bg-amber-900/40 border-amber-700 text-amber-300'
                    : 'bg-slate-700 border-slate-600 text-slate-200'
                }`}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Units <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                {...register('units', { required: true, min: 1, valueAsNumber: true })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.units && <p className="text-red-400 text-xs mt-1">Min 1 unit</p>}
            </div>
          </div>

          {/* Time fields */}
          <div>
            <p className="text-slate-300 text-sm font-medium mb-2">Time Breakdown (seconds)</p>
            <div className="grid grid-cols-3 gap-3">
              {(['tracksTimeSec', 'drillsTimeSec', 'cutoutTimeSec'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-slate-500 text-xs mb-1 capitalize">
                    {field === 'tracksTimeSec' ? 'Tracks' : field === 'drillsTimeSec' ? 'Drills' : 'Cutout'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register(field, { min: 0, valueAsNumber: true })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Failure notes — required when status is failed */}
          {status === 'failed' && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Failure Report <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register('failureNotes', { required: 'Failure report is required when status is Failed' })}
                placeholder="Describe what went wrong in detail."
                rows={3}
                className="w-full bg-slate-700 border border-red-800/50 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              {errors.failureNotes && (
                <p className="text-red-400 text-xs mt-1">{errors.failureNotes.message}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Update Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
