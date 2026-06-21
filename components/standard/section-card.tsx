import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface SectionCardProps {
  title: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  contentClassName?: string
  actions?: React.ReactNode
}

export function SectionCard({ title, icon: Icon, children, className, contentClassName, actions }: SectionCardProps) {
  return (
    <Card className={cn("bg-zinc-900/30 border-zinc-800 overflow-hidden flex flex-col", className)}>
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {title}
        </h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={cn("p-4 flex-1", contentClassName)}>
        {children}
      </div>
    </Card>
  )
}
