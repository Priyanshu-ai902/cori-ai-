'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PatchDiffViewerProps {
  diff: string
  fileName?: string
}

export function PatchDiffViewer({ diff, fileName }: PatchDiffViewerProps) {
  const lines = diff.split('\n')
  
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden font-mono text-xs">
      {fileName && (
        <div className="bg-secondary/50 px-4 py-2 border-b border-border text-muted-foreground flex items-center justify-between">
          <span>{fileName}</span>
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Unified Diff</span>
        </div>
      )}
      <div className="overflow-x-auto p-4 space-y-0.5">
        {lines.map((line, i) => {
          const isAdded = line.startsWith('+') && !line.startsWith('+++')
          const isRemoved = line.startsWith('-') && !line.startsWith('---')
          const isHeader = line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')

          return (
            <div 
              key={i} 
              className={cn(
                "whitespace-pre min-h-[1.25rem] px-2 rounded-sm",
                isAdded && "bg-emerald-500/10 text-emerald-400",
                isRemoved && "bg-rose-500/10 text-rose-400",
                isHeader && "text-blue-400 font-bold opacity-80",
                !isAdded && !isRemoved && !isHeader && "text-muted-foreground"
              )}
            >
              {line}
            </div>
          )
        })}
      </div>
    </div>
  )
}
