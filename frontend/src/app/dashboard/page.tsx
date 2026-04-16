import Link from 'next/link'
import { Code2, Calendar, ClipboardList, Users, ShoppingBag, ArrowRight, Zap } from 'lucide-react'

const apps = [
  {
    href: '/gcode',
    label: 'G-Code Tool',
    icon: Code2,
    description: 'Concatenate, reorder and filter CNC .nc / .gcode files. Optionally strip exact M0/M6 commands before download.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-700/40',
    hoverBg: 'hover:bg-violet-500/20',
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Users,
    description: 'Manage customer records — name, company and contact details. Foundation for orders and machining traceability.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-700/40',
    hoverBg: 'hover:bg-emerald-500/20',
  },
  {
    href: '/orders',
    label: 'Orders',
    icon: ShoppingBag,
    description: 'Track PCB orders linked to clients. Each order carries an identifier and a version tag (e.g. V1, V2.1).',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-700/40',
    hoverBg: 'hover:bg-amber-500/20',
  },
  {
    href: '/cnc-reports',
    label: 'Machining Sessions',
    icon: ClipboardList,
    description: 'Log CNC machining runs per client/order, track status (pending → running → done/failed), and export PDF reports.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-700/40',
    hoverBg: 'hover:bg-sky-500/20',
  },
  {
    href: '/scheduler',
    label: 'Flux Scheduler',
    icon: Calendar,
    description: 'Weekly calendar for team meetings. Supports Google Calendar OAuth2 sync and attendee invitations.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-700/40',
    hoverBg: 'hover:bg-pink-500/20',
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-10 px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="text-sky-400" size={32} />
          <h1 className="text-3xl font-bold text-white tracking-tight">Flux Engineering Hub</h1>
        </div>
        <p className="text-slate-400 text-base max-w-xl">
          Integrated platform for PCB production traceability and administrative management at Flux Mecatrónica.
        </p>
      </div>

      {/* App cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {apps.map(({ href, label, icon: Icon, description, color, bg, hoverBg }) => (
          <Link
            key={href}
            href={href}
            className={`group flex flex-col justify-between p-6 rounded-2xl border ${bg} ${hoverBg} transition-all duration-200 cursor-pointer`}
          >
            <div>
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800 mb-4`}>
                <Icon className={color} size={22} />
              </div>
              <h2 className="text-white font-semibold text-lg mb-2">{label}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
            <div className={`flex items-center gap-1 mt-5 text-sm font-medium ${color}`}>
              Open app
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
