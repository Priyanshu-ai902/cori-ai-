'use client'

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import { 
  GitPullRequest, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  ChevronRight,
  Database,
  History,
  X,
  ShieldCheck,
  Zap,
  Activity,
  ArrowUpRight,
  Terminal,
  Layers,
  FileCode,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

import { StatusBadge } from '@/components/standard/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const formatSafeDistance = (date: string | null | undefined) => {
  if (!date) return 'Never'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'Never'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch (e) {
    return 'Never'
  }
}

export default function PullRequestsPage() {
  const { data: pullRequests, isLoading } = useSWR('/api/pull-requests', fetcher)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedPR = useMemo(() => 
    pullRequests?.find((pr: any) => pr.id === selectedId),
    [pullRequests, selectedId]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 bg-black">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Synchronizing Workspace...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-8 lg:px-12 space-y-16 min-h-screen pb-32">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">Pull Requests</h1>
          <p className="text-zinc-500 text-sm font-medium">Authoritative queue of autonomous remediation branches.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {pullRequests?.length || 0} Total Fixes
            </span>
          </div>
        </div>
      </div>

      {/* PR Table/List */}
      <div className="space-y-1">
        <div className="grid grid-cols-[80px_1fr_250px_120px_120px_140px_40px] gap-6 px-4 pb-4 border-b border-white/5">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Reference</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Title</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Repository</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Status</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Verification</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Created</span>
          <div />
        </div>

        {pullRequests && pullRequests.length > 0 ? pullRequests.map((pr: any) => (
          <div 
            key={pr.id}
            onClick={() => setSelectedId(pr.id)}
            className={cn(
              "grid grid-cols-[80px_1fr_250px_120px_120px_140px_40px] gap-6 px-4 h-16 hover:bg-white/[0.02] border-b border-white/5 transition-all group cursor-pointer items-center relative",
              selectedId === pr.id && "bg-white/[0.04]"
            )}
          >
            {selectedId === pr.id && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
            )}

            <div className="flex items-center">
              <span className="text-[11px] font-mono text-zinc-500 font-bold group-hover:text-zinc-300 transition-colors">
                #{pr.prNumber}
              </span>
            </div>

            <div className="flex flex-col min-w-0 pr-4">
              <span className="text-[13px] font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors truncate">
                {pr.title}
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0 pr-4">
              <Database className="w-3 h-3 text-zinc-700 shrink-0" />
              <span className="text-[11px] text-zinc-500 font-medium truncate">{pr.repoName}</span>
            </div>

            <div className="flex items-center">
              <StatusBadge status={pr.status} className="h-6 px-2 text-[9px] border-zinc-800/50" />
            </div>

            <div className="flex items-center gap-1.5">
              {pr.status === 'RESOLVED' || pr.status === 'VERIFIED' ? (
                 <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                   <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified
                 </div>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                  <Clock className="w-3 h-3" /> Pending
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-zinc-700 font-medium whitespace-nowrap">
                {formatDistanceToNow(new Date(pr.createdAt))} ago
              </span>
            </div>

            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-zinc-700" />
            </div>
          </div>
        )) : (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-2xl mt-4 bg-white/[0.01]">
             <GitPullRequest className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
             <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">No active requests</p>
             <p className="text-zinc-800 text-[10px] mt-2 max-w-xs mx-auto">Automated fixes from the CORI perimeter will appear here.</p>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[650px] bg-[#080808] border-l border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] transition-transform duration-500 ease-in-out z-50 flex flex-col",
        selectedId ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedPR && (
          <>
            {/* Drawer Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01] sticky top-0 z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedPR.title}</h3>
                  <StatusBadge status={selectedPR.status} />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  <span>PR #{selectedPR.prNumber}</span>
                  <span className="text-zinc-800">•</span>
                  <span>{selectedPR.repository}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedId(null)}
                  className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-32 custom-scrollbar">
              
              {/* Primary Action */}
              <div className="p-1 rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden">
                <Button 
                  asChild
                  className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[11px] gap-2 rounded-xl"
                >
                  <a href={selectedPR.prUrl} target="_blank" rel="noopener noreferrer">
                    Open in GitHub
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>

              {/* Context Summary */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Lifecycle Timeline
                    </span>
                    <div className="space-y-4 pt-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[11px] text-zinc-500">Created</span>
                          <span className="text-[11px] text-zinc-300 font-mono">{format(new Date(selectedPR.createdAt), 'MMM d, HH:mm')}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[11px] text-zinc-500">Last Synced</span>
                          <span className="text-[11px] text-zinc-300 font-mono">{format(new Date(selectedPR.updatedAt), 'MMM d, HH:mm')}</span>
                       </div>
                       {selectedPR.verifiedAt && (
                         <div className="flex justify-between items-center">
                            <span className="text-[11px] text-zinc-500">Verification</span>
                            <span className="text-[11px] text-emerald-500 font-mono font-bold uppercase">COMPLETED</span>
                         </div>
                       )}
                    </div>
                 </div>
                 
                 <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Remediation Context
                    </span>
                    <div className="space-y-4 pt-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[11px] text-zinc-500">Workflow</span>
                          <span className="text-[11px] text-zinc-300 truncate max-w-[120px]">{selectedPR.workflow}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[11px] text-zinc-500">Confidence</span>
                          <span className="text-[11px] text-blue-500 font-bold">{selectedPR.confidence}%</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Related Entities */}
              <section className="space-y-6">
                <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Linked Operations</h4>
                <div className="grid grid-cols-1 gap-3">
                   {selectedPR.incidentId && (
                     <Button variant="outline" className="h-14 justify-between px-6 border-white/5 bg-white/[0.01] hover:bg-white/5 rounded-2xl" asChild>
                        <Link href={`/dashboard/failures?id=${selectedPR.incidentId}`}>
                           <div className="flex items-center gap-4">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <div className="text-left">
                                 <p className="text-[11px] font-bold text-white uppercase tracking-wider">Root Incident</p>
                                 <p className="text-[10px] text-zinc-500 font-mono">#{selectedPR.incidentId.substring(0, 12)}</p>
                              </div>
                           </div>
                           <ChevronRight className="w-4 h-4 text-zinc-800" />
                        </Link>
                     </Button>
                   )}
                   <Button variant="outline" className="h-14 justify-between px-6 border-white/5 bg-white/[0.01] hover:bg-white/5 rounded-2xl" asChild>
                      <Link href={`/dashboard/verifications?id=${selectedPR.id}`}>
                         <div className="flex items-center gap-4">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                            <div className="text-left">
                               <p className="text-[11px] font-bold text-white uppercase tracking-wider">Verification Payload</p>
                               <p className="text-[10px] text-zinc-500 font-mono">Autonomous Test Suite</p>
                            </div>
                         </div>
                         <ChevronRight className="w-4 h-4 text-zinc-800" />
                      </Link>
                   </Button>
                </div>
              </section>

              {/* Fix Summary */}
              {selectedPR.description && (
                <section className="space-y-6 pt-6 border-t border-white/5">
                  <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                    <FileCode className="w-4 h-4" /> AI Fix Summary
                  </h4>
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
                    <p className="text-xs text-zinc-400 leading-relaxed italic">
                      "{selectedPR.description}"
                    </p>
                  </div>
                </section>
              )}

            </div>
          </>
        )}
      </div>

      {/* Overlay */}
      {selectedId && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-all duration-500"
          onClick={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
