import React from 'react'
import { cn } from '@/lib/utils'

export type StatusType = 'success' | 'running' | 'pending' | 'warning' | 'failed' | 'neutral'

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
  label?: string
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const s = status.toLowerCase()
  const isRunning = ['running', 'in_progress', 'retriggering', 'workflow_retriggered', 'build_running', 'tests_running'].includes(s)
  
  const getStyles = (statusStr: string) => {
    switch (statusStr) {
      case 'success':
      case 'verified':
      case 'ready_for_pr':
      case 'resolved':
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'running':
      case 'in_progress':
      case 'retriggering':
      case 'workflow_retriggered':
      case 'build_running':
      case 'tests_running':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'warning':
      case 'analyzed':
      case 'patch_generated':
      case 'requires_dependency_resolution':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'failed':
      case 'failed_verification':
      case 'failure':
      case 'pr_failed':
      case 'remediation_failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'pending':
      case 'queued':
      case 'pr_created':
      case 'pr_merged':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    }
  }

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border flex items-center gap-1.5 w-fit",
      getStyles(s),
      className
    )}>
      {isRunning && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
        </span>
      )}
      {label || status.replace(/_/g, ' ')}
    </span>
  )
}
