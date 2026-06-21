'use client'

import React from 'react'
import { X, Terminal } from 'lucide-react'

interface LogViewerProps {
  logs: string
  onClose: () => void
}

export function LogViewer({ logs, onClose }: LogViewerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm">Workflow Logs</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-[#0d1117] font-mono text-xs text-gray-300 whitespace-pre leading-relaxed">
          {logs}
        </div>
      </div>
    </div>
  )
}
