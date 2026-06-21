'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import useSWR from 'swr'
import { 
  Activity, 
  Zap, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Database,
  Code2,
  FileCode,
  Clock,
  Terminal,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Command
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/standard/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CommandCenterPage() {
  const { data: session, status } = useSession()
  const { data: dashboardData, isLoading } = useSWR('/api/dashboard/stats', fetcher)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const recentFailures = dashboardData?.recentFailures || []
  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId && recentFailures.length > 0) return recentFailures[0]
    return recentFailures.find((f: any) => f.id === selectedIncidentId)
  }, [recentFailures, selectedIncidentId])

  useEffect(() => {
    if (!selectedIncidentId && recentFailures.length > 0) {
      setSelectedIncidentId(recentFailures[0].id)
    }
  }, [recentFailures, selectedIncidentId])

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#050505]">
        <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-zinc-500 animate-pulse" />
        </div>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Traversing Incident Graph...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-6 bg-[#050505]">
        <Button onClick={() => signIn()} className="bg-white text-black hover:bg-zinc-200">Initialize Session</Button>
      </div>
    )
  }

  const incident = selectedIncident?.incidents?.[0]
  const issue = incident?.issues?.[0]
  const events = incident?.events || []

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505]">
      {/* LEFT PANEL: Incident Feed */}
      <div className={cn(
        "flex flex-col border-r border-white/5 bg-[#080808] transition-all duration-300 ease-in-out relative",
        isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[320px]"
      )}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between min-w-[320px]">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Active Incidents</h2>
          <button 
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1 hover:bg-white/5 rounded text-zinc-500 transition-all"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-w-[320px]">
          {recentFailures.length > 0 ? recentFailures.map((run: any) => {
            const runIncident = run.incidents[0]
            const isSelected = selectedIncidentId === run.id
            return (
              <div 
                key={run.id}
                onClick={() => setSelectedIncidentId(run.id)}
                className={cn(
                  "p-4 border-b border-white/5 cursor-pointer transition-all duration-150 relative",
                  isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                )}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-zinc-600 uppercase">#{run.id.substring(0, 8)}</span>
                    <span className="text-[9px] text-zinc-500">{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</span>
                  </div>
                  <h3 className={cn(
                    "text-[13px] font-semibold leading-tight transition-colors",
                    isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                  )}>
                    {runIncident?.title || run.workflow.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={runIncident?.status?.toLowerCase() || 'failure'} label={runIncident?.status || 'FAILING'} className="text-[8px] px-1.5 py-0" />
                    <span className="text-[10px] text-zinc-600 truncate">{run.workflow.repository.name}</span>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="p-12 text-center opacity-20">
              <ShieldCheck className="w-8 h-8 mx-auto mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest">All Systems Operational</p>
            </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL: Analysis & Evidence */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
        {isSidebarCollapsed && (
          <button 
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-20 p-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all shadow-xl"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {selectedIncident ? (
          <>
            {/* Header */}
            <div className={cn("p-6 border-b border-white/5 flex items-center justify-between", isSidebarCollapsed && "pl-16")}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  <Layers className="w-3 h-3" />
                  Operator Analysis
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {incident?.title || selectedIncident.workflow.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Confidence</span>
                    <div className="flex items-center gap-2">
                       <div className="w-20 h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-blue-600" style={{ width: `${issue?.confidence || 0}%` }} />
                       </div>
                       <span className="text-[10px] font-mono text-blue-500">{issue?.confidence || 0}%</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Root Cause Analysis */}
              {issue?.rootCause && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Root Cause Analysis
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 leading-relaxed">
                      <p className="text-[15px] text-zinc-300 font-medium italic">
                        "{issue.rootCause}"
                      </p>
                  </div>
                </section>
              )}

              {/* Evidence & Details */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                 <section className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                       <Terminal className="w-3.5 h-3.5" />
                       Failure Evidence
                    </div>
                    <div className="bg-black border border-white/5 rounded-xl p-4 font-mono text-[12px] text-zinc-500 min-h-[120px]">
                       {issue?.aiFixSummary ? (
                         <>
                           <div className="flex items-center gap-2 mb-3 text-zinc-700">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="uppercase text-[10px] font-bold">Process Error Log</span>
                           </div>
                           <pre className="whitespace-pre-wrap break-all opacity-80">{issue.aiFixSummary}</pre>
                         </>
                       ) : (
                         <p className="text-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center h-full">No evidence synthesized</p>
                       )}
                    </div>
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                       <FileCode className="w-3.5 h-3.5" />
                       Affected Files
                    </div>
                    <div className="space-y-2">
                       {issue?.file ? (
                         <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg group hover:border-white/10 transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                               <Code2 className="w-4 h-4 text-zinc-600" />
                               <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors font-mono">{issue.file}</span>
                            </div>
                            <span className="text-[10px] text-zinc-600 tabular-nums">L:{issue.line || '??'}</span>
                         </div>
                       ) : (
                         <div className="p-8 text-center border border-dashed border-white/5 rounded-xl opacity-30 text-[10px] font-bold uppercase tracking-widest">
                            No files localized
                         </div>
                       )}
                    </div>
                 </section>
              </div>

              {/* Lifecycle Timeline */}
              {events.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      Remediation Timeline
                  </div>
                  <div className="relative pl-6 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5 space-y-8">
                      {events.map((event: any, i: number) => (
                        <div key={event.id} className="relative group">
                          <div className={cn(
                            "absolute -left-[27px] top-1.5 w-2 h-2 rounded-full border border-black z-10 bg-blue-500",
                            i === events.length - 1 && "animate-pulse"
                          )} />
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-300">
                                {event.status.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-600 uppercase">
                                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                              </span>
                          </div>
                          {event.details && (
                            <p className="text-[11px] text-zinc-600 mt-1 max-w-lg leading-relaxed">{event.details}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-4">
             <Command className="w-16 h-16" />
             <span className="text-[11px] font-bold uppercase tracking-[0.4em]">Awaiting Selection</span>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Operator Actions */}
      <div className="w-[300px] flex flex-col border-l border-white/5 bg-[#080808]">
        <div className="p-6 border-b border-white/5">
           <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Operator Console</h2>
        </div>
        
        <div className="flex-1 p-6 flex flex-col gap-8">
           {selectedIncident ? (
             <>
               <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                     <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Platform Context</span>
                        <div className="flex items-center gap-2">
                           <Database className="w-3.5 h-3.5 text-zinc-500" />
                           <span className="text-xs font-bold text-zinc-300">{selectedIncident.workflow.repository.name}</span>
                        </div>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Execution Branch</span>
                        <div className="flex items-center gap-2">
                           <Activity className="w-3.5 h-3.5 text-zinc-500" />
                           <span className="text-xs font-bold text-zinc-300 font-mono">{selectedIncident.branch}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-3 mt-auto">
                  <Button asChild className="w-full bg-white text-black hover:bg-zinc-200 h-11 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all">
                    <Link href={`/dashboard/failures?incident=${selectedIncident.id}`}>
                      Generate Fix
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-white/5 bg-white/[0.02] text-zinc-400 h-11 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-white/[0.05]">
                    <Link href="/dashboard/verifications">
                      Verify Patch
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-white/5 bg-white/[0.02] text-zinc-400 h-11 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-white/[0.05]">
                    <Link href="/dashboard/pull-requests">
                      Create Pull Request
                    </Link>
                  </Button>
                  
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <Button variant="ghost" className="w-full h-10 text-zinc-600 hover:text-white text-[10px] font-bold uppercase tracking-widest" asChild>
                       <Link href={`/dashboard/failures?incident=${selectedIncident.id}`}>
                          <ExternalLink className="w-3.5 h-3.5 mr-2" /> View Runtime Logs
                       </Link>
                    </Button>
                  </div>
               </div>
             </>
           ) : (
             <div className="flex-1 flex items-center justify-center opacity-20">
                <span className="text-[9px] font-bold uppercase tracking-widest rotate-90 whitespace-nowrap">Operator Offline</span>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
