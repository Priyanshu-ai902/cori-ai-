'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  GitPullRequest,
  AlertTriangle,
  Settings,
  LogOut,
  Command,
  Database,
  ShieldCheck,
  Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mainNav = [
  {
    label: 'Command Center',
    href: '/dashboard',
    icon: Cpu,
  },
  {
    label: 'Repositories',
    href: '/dashboard/repositories',
    icon: Database,
  },
  {
    label: 'Incidents',
    href: '/dashboard/failures',
    icon: AlertTriangle,
  },
  {
    label: 'Verification',
    href: '/dashboard/verifications',
    icon: ShieldCheck,
  },
  {
    label: 'Pull Requests',
    href: '/dashboard/pull-requests',
    icon: GitPullRequest,
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] bg-[#080808] border-r border-white/5 flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
          <Command className="w-3.5 h-3.5 text-black" />
        </div>
        <span className="text-sm font-bold text-white tracking-tight uppercase">CORI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {mainNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
                isActive
                  ? 'bg-white/[0.06] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        
        <div className="pt-2 mt-2 border-t border-white/5">
          <Link
            href="/dashboard/settings"
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]',
              pathname === '/dashboard/settings' && 'text-white bg-white/[0.06]'
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-white/5 mt-auto">
        <div className="flex items-center justify-between group cursor-pointer hover:bg-white/[0.03] p-1.5 rounded-lg transition-all duration-150">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
              <span className="text-[10px] font-bold text-zinc-400">{userInitial}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-zinc-200 truncate max-w-[120px]">
                {session?.user?.name || session?.user?.email?.split('@')[0]}
              </span>
            </div>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-zinc-600 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
