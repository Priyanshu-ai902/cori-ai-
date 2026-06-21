import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, Circle } from 'lucide-react'

interface TimelineItem {
  id: string | number
  title: string
  timestamp: string
  description?: string
  icon?: LucideIcon
  status?: 'success' | 'failed' | 'running' | 'pending'
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

export function Timeline({ items, className }: TimelineProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-emerald-500 bg-emerald-500/20'
      case 'failed': return 'text-red-500 bg-red-500/20'
      case 'running': return 'text-blue-500 bg-blue-500/20'
      default: return 'text-zinc-500 bg-zinc-800'
    }
  }

  return (
    <div className={cn("space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-800", className)}>
      {items.map((item, i) => {
        const Icon = item.icon || Circle
        return (
          <div key={item.id} className="relative pl-8 group">
            <div className={cn(
              "absolute left-0 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border border-zinc-900 z-10 transition-transform group-hover:scale-110",
              getStatusColor(item.status)
            )}>
              <Icon className="w-2.5 h-2.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-sm font-bold text-white leading-none">{item.title}</h4>
                <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">{item.timestamp}</span>
              </div>
              {item.description && <p className="text-xs text-zinc-500 leading-relaxed">{item.description}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
