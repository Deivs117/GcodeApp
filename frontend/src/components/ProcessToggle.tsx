'use client'

interface ProcessToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}

export default function ProcessToggle({ label, description, checked, onChange }: ProcessToggleProps) {
  return (
    <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        {description && <p className="text-slate-500 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-sky-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
