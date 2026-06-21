'use client'

import useSWR from 'swr'
import { useState, useMemo, useEffect } from 'react'
import { 
  ShieldCheck, 
  Activity, 
  Clock, 
  GitPullRequest, 
  GitBranch,
  CheckCircle2, 
  XCircle, 
  RefreshCcw,
  ExternalLink,
  ChevronRight,
  Workflow,
  Database,
  History,
  ChevronDown,
  Search,
  Filter,
  ArrowRight,
  Zap,
  Terminal,
  Layers,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

import { StatusBadge } from '@/components/standard/status-badge'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function VerificationCenterPage() {
  const { data: verifications, mutate, isLoading, isValidating } = useSWR('/api/verifications', fetcher)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Default selection: select first item when data loads
  useMemo(() => {
    if (verifications?.length > 0 && !selectedId) {
      setSelectedId(verifications[0].id)
    }
  }, [verifications, selectedId])

  const syncVerification = async (id: string) => {
    try {
      await fetch(`/api/verifications/${id}/sync`, { method: 'POST' })
      mutate()
    } catch (err) {
      console.error('Failed to sync verification:', err)
    }
  }

  // Trigger sync on selection
  useEffect(() => {
    if (selectedId) {
      syncVerification(selectedId)
    }
  }, [selectedId])

  const selectedVerification = useMemo(() => 
    verifications?.find((v: any) => v.id === selectedId),
    [verifications, selectedId]
  )

  const filteredVerifications = useMemo(() => 
    verifications?.filter((v: any) => 
      v.patchTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.repository.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [verifications, searchQuery]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4 bg-black">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Loading Workspace...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-black text-zinc-400">
      {/* QUEUE SIDEBAR */}
      <div className="w-[380px] border-r border-white/5 flex flex-col bg-black">
        <div className="p-5 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
               Verification Queue
            </h1>
            <span className="text-[10px] font-medium text-zinc-600">
              {verifications?.length || 0} items
            </span>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-zinc-900/30 border border-white/5 rounded-md text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredVerifications?.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filteredVerifications.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "w-full p-5 text-left transition-all relative group",
                    selectedId === v.id ? "bg-white/[0.03]" : "hover:bg-white/[0.015]"
                  )}
                >
                  {selectedId === v.id && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-zinc-200" />}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                       <span className="text-[12px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
                         {v.patchTitle}
                       </span>
                       <StatusBadge status={v.status} className="text-[8px] h-5 px-1.5 shrink-0 border-zinc-800/50" />
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                       <div className="flex items-center gap-1.5 min-w-0">
                          <Database className="w-3 h-3 shrink-0" />
                          <span className="truncate">{v.repoName}</span>
                       </div>
                       <span className="text-zinc-800">•</span>
                       <div className="flex items-center gap-1.5 shrink-0">
                          <Zap className="w-3 h-3 shrink-0" />
                          <span>{v.failureType}</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between">
                       <span className="text-[9px] text-zinc-700 uppercase font-medium tracking-wider">
                         {formatDistanceToNow(new Date(v.updatedAt))} ago
                       </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4 opacity-30">
               <ShieldCheck className="w-10 h-10 text-zinc-700" />
               <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Queue Empty</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL VIEW */}
      <div className="flex-1 flex flex-col bg-black relative">
        {selectedVerification ? (
          <>
            {/* Detail Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{selectedVerification.patchTitle}</h2>
                  <StatusBadge status={selectedVerification.status} className="border-zinc-800/50" />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                     <Database className="w-3 h-3" />
                     {selectedVerification.repository}
                  </span>
                  <span className="text-zinc-800">•</span>
                  <span className="flex items-center gap-1.5">
                     <GitBranch className="w-3 h-3" />
                     {selectedVerification.branch}
                  </span>
                  <span className="text-zinc-800">•</span>
                  <span className="flex items-center gap-1.5">
                     <History className="w-3 h-3" />
                     {selectedVerification.commitSha?.substring(0, 7)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <Button 
                   variant="outline" 
                   className="h-8 border-white/5 bg-transparent text-zinc-500 font-medium uppercase tracking-widest text-[9px] px-3 gap-2 hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
                   onClick={() => {
                     mutate()
                     if (selectedId) syncVerification(selectedId)
                   }}
                   disabled={isValidating}
                 >
                    <RefreshCcw className={cn("w-3 h-3", isValidating && "animate-spin text-blue-500")} />
                    {isValidating ? 'Refreshing...' : 'Refresh'}
                 </Button>
                 {selectedVerification.prUrl && (

                   <Button 
                     asChild
                     className="h-8 bg-zinc-200 text-black hover:bg-white font-bold uppercase tracking-widest text-[9px] px-3 gap-2"
                   >
                     <a href={selectedVerification.prUrl} target="_blank" rel="noopener noreferrer">
                        Pull Request
                        <ExternalLink className="w-3 h-3" />
                     </a>
                   </Button>
                 )}
              </div>
            </div>

            {/* Lifecycle Visualization */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
               <div className="max-w-4xl mx-auto space-y-16">
                  
                  {/* Progress Stepper */}
                  <div className="space-y-10">
                    <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2.5">
                       <Workflow className="w-3.5 h-3.5" />
                       Verification Workflow
                    </h3>

                    <div className="flex items-center justify-between px-4 relative">
                       {/* Connector Line */}
                       <div className="absolute top-[14px] left-[60px] right-[60px] h-[1px] bg-zinc-900" />
                       
                       {[
                         { label: 'Analysis', status: 'success' },
                         { label: 'Generation', status: 'success' },
                         { 
                           label: 'Validation', 
                           status: selectedVerification.status === 'GENERATED' ? 'running' : 'success' 
                         },
                         { 
                           label: 'PR Created', 
                           status: ['PR_CREATED', 'RESOLVED'].includes(selectedVerification.status) ? 'success' : 'pending' 
                         },
                         { 
                           label: 'Resolved', 
                           status: selectedVerification.status === 'RESOLVED' ? 'success' : 'pending' 
                         }
                       ].map((step, i) => (
                         <div key={step.label} className="flex flex-col items-center gap-4 relative z-10 w-32">
                            <div className={cn(
                              "w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-500",
                              step.status === 'success' ? "bg-zinc-200 border-zinc-200 text-black" :
                              step.status === 'running' ? "bg-black border-blue-500/50 text-blue-500" :
                              "bg-black border-zinc-800 text-zinc-800"
                            )}>
                               {step.status === 'success' ? <Check className="w-3.5 h-3.5" /> : 
                                step.status === 'running' ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : 
                                <span className="text-[9px] font-bold">{i + 1}</span>}
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium uppercase tracking-tight text-center",
                              step.status !== 'pending' ? "text-zinc-300" : "text-zinc-700"
                            )}>
                              {step.label}
                            </span>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Operational Context */}
                  <div className="grid grid-cols-2 gap-12 pt-12 border-t border-white/5">
                    <div className="space-y-6">
                       <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2.5">
                          <Terminal className="w-3.5 h-3.5" />
                          System Telemetry
                       </h3>

                       <div className="p-6 rounded-lg bg-zinc-900/20 border border-white/5 space-y-5">
                          <div className="flex items-center gap-3">
                             <Layers className="w-3.5 h-3.5 text-zinc-500" />
                             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Confidence</span>
                          </div>
                          
                          <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-zinc-600 font-sans">AI Certainty Index</span>
                                <span className="text-zinc-300">{selectedVerification.confidence || 0}%</span>
                             </div>
                             <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-zinc-300 transition-all duration-1000" 
                                  style={{ width: `${selectedVerification.confidence || 0}%` }} 
                                />
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Signal Metrics
                       </h3>
                       
                       <div className="p-6 rounded-lg bg-zinc-900/20 border border-white/5 space-y-4">
                          {[
                            { label: 'Build Stability', val: 'NOMINAL', color: 'text-emerald-500/80' },
                            { label: 'Log Anomalies', val: 'CLEAR', color: 'text-zinc-500' },
                            { label: 'Latency Shift', val: '0.0ms', color: 'text-emerald-500/80' }
                          ].map(metric => (
                            <div key={metric.label} className="flex items-center justify-between">
                               <span className="text-[10px] text-zinc-600">{metric.label}</span>
                               <span className={cn("text-[9px] font-bold tracking-widest uppercase", metric.color)}>{metric.val}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
