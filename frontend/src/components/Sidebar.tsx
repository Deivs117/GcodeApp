'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Code2, Calendar, ClipboardList, Zap } from 'lucide-react'

const navItems = [
  {
    href: '/gcode',
    label: 'G-Code Tool',
    icon: Code2,
    description: 'Concatenate & filter NC files',
  },
  {
    href: '/scheduler',
    label: 'Flux Scheduler',
    icon: Calendar,
    description: 'Meeting & calendar management',
  },
  {
    href: '/cnc-reports',
    label: 'CNC Reports',
    icon: ClipboardList,
    description: 'PCB machining logs & PDF export',
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="text-sky-400" size={22} />
          <span className="text-white font-bold text-lg tracking-tight">Flux Hub</span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5">Engineering Platform</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, description }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-colors group ${
                active
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon
                size={18}
                className={`mt-0.5 shrink-0 ${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`}
              />
              <div>
                <p className={`text-sm font-medium ${active ? 'text-sky-400' : ''}`}>{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs">Flux Mecatrónica © 2025</p>
      </div>
    </aside>
  )
}
