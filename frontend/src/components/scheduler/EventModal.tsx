'use client'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { X, Calendar, Users, Clock } from 'lucide-react'

export interface EventFormData {
  title: string
  description: string
  startTime: string
  endTime: string
  attendees: string
}

interface EventModalProps {
  open: boolean
  initialStart?: string
  initialEnd?: string
  onClose: () => void
  onSubmit: (data: EventFormData) => Promise<void>
}

export default function EventModal({
  open,
  initialStart,
  initialEnd,
  onClose,
  onSubmit,
}: EventModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>()

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      reset()
      if (initialStart) setValue('startTime', initialStart)
      if (initialEnd) setValue('endTime', initialEnd)
    }
  }, [open, initialStart, initialEnd, reset, setValue])

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Calendar className="text-sky-400" size={20} />
            <h2 className="text-white font-semibold text-lg">New Meeting</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="Meeting title"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {errors.title && (
              <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">Description</label>
            <textarea
              {...register('description')}
              placeholder="Optional notes or agenda"
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                <Clock size={12} className="inline mr-1" />
                Start <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('startTime', { required: 'Start time is required' })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.startTime && (
                <p className="text-red-400 text-xs mt-1">{errors.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                <Clock size={12} className="inline mr-1" />
                End <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('endTime', { required: 'End time is required' })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {errors.endTime && (
                <p className="text-red-400 text-xs mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1">
              <Users size={12} className="inline mr-1" />
              Attendees (comma-separated emails)
            </label>
            <input
              {...register('attendees')}
              placeholder="juan@flux.com, samuel@flux.com, ktalyna@flux.com"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-slate-500 text-xs mt-1">
              They will receive a Google Calendar invitation.
            </p>
          </div>

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
              {isSubmitting ? 'Saving…' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
