import React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'zinc'
}

export function StatCard({ label, value, subValue, icon: Icon, trend, color = 'zinc' }: StatCardProps) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
    yellow: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    zinc: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
  }

  return (
    <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
            {subValue && <span className="text-[10px] font-medium text-zinc-500">{subValue}</span>}
          </div>
        </div>
        <div className={cn("p-2 rounded-lg border", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  )
}
