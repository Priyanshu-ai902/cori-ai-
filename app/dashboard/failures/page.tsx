'use client'

import { useSWRConfig } from 'swr'
import useSWR from 'swr'
import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  Terminal, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  BrainCircuit,
  ShieldCheck,
  X,
  ShieldAlert,
  ChevronRight,
  GitBranch,
  Activity,
  ArrowRight,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { LogViewer } from '@/components/log-viewer'
import { StatusBadge } from '@/components/standard/status-badge'
import { Button } from '@/components/ui/button'
import { IssueCard } from '@/components/issue-card'
import { Timeline } from '@/components/standard/timeline'
import { DataTable } from '@/components/standard/data-table'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function IncidentsPage() {
  const { mutate } = useSWRConfig()
  const { data: incidents, isLoading } = useSWR('/api/incidents', fetcher)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showLogViewer, setShowLogViewer] = useState(false)
  const [logs, setLogs] = useState('')

  const { data: issues, mutate: mutateIssues } = useSWR(
    selectedIncidentId ? `/api/incidents/${selectedIncidentId}/issues` : null, 
    fetcher
  )

  const selectedIncident = Array.isArray(incidents) ? incidents.find((i: any) => i.id === selectedIncidentId) : null
  const analysis = selectedIncident?.workflowRun?.analyses?.[0]

  const handleRunRCA = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!selectedIncidentId) return
    setIsAnalyzing(true)
    try {
      const res = await fetch(`/api/incidents/${selectedIncidentId}/analyze`, { method: 'POST' })
      if (res.ok) {
        await mutate('/api/incidents')
        await mutateIssues()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApplyFix = async (issueId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/generate-fix`, { method: 'POST' })
      if (res.ok) {
        await mutateIssues()
      } else {
        const data = await res.json()
        throw data
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const handleApprove = async (issueId: string, patchId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/apply`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId, status: 'APPROVED' })
      })
      if (res.ok) await mutateIssues()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreatePR = async (issueId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/create-pr`, { method: 'POST' })
      if (res.ok) {
        await mutateIssues()
        await mutate('/api/incidents')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleIgnore = async (issueId: string) => {
    console.log('Ignore issue:', issueId)
  }

  const handleViewLogs = async () => {
    if (!selectedIncident?.workflowRun?.id) return
    try {
      const res = await fetch(`/api/workflow-runs/${selectedIncident.workflowRun.id}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setShowLogViewer(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
          <Activity className="w-4 h-4 text-zinc-500 animate-pulse" />
        </div>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Analyzing Perimeter...</p>
      </div>
    )
  }

  const incidentTimeline = selectedIncident ? [
    {
      id: 'detected',
      title: 'Incident Detected',
      timestamp: format(new Date(selectedIncident.createdAt), 'HH:mm:ss'),
      description: `Failure detected on ${selectedIncident.workflowRun.branch}`,
      icon: AlertTriangle,
      status: 'failed' as const
    },
    ...(analysis ? [{
      id: 'rca',
      title: 'RCA Generated',
      timestamp: format(new Date(analysis.createdAt), 'HH:mm:ss'),
      description: 'Root cause analysis complete',
      icon: BrainCircuit,
      status: 'success' as const
    }] : []),
    ...(issues?.length > 0 ? [{
      id: 'issues',
      title: 'Issues Extracted',
      timestamp: format(new Date(issues[0].createdAt), 'HH:mm:ss'),
      description: `${issues.length} structured issues identified`,
      icon: ShieldAlert,
      status: 'success' as const
    }] : [])
  ] : [];

  const incidentList = Array.isArray(incidents) ? incidents : []

  return (
    <div className="max-w-6xl mx-auto py-12 px-8 lg:px-12 space-y-16 min-h-screen pb-32">
      {showLogViewer && <LogViewer logs={logs} onClose={() => setShowLogViewer(false)} />}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">Incidents</h1>
          <p className="text-zinc-500 text-sm">Monitor and remediate automated workflow failures.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
              {incidentList.filter((i: any) => i.status !== 'RESOLVED').length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="space-y-1">
        <div className="grid grid-cols-[400px_200px_100px_1fr_40px] gap-8 px-4 pb-4 border-b border-white/5">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Incident</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden md:block">Execution</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden lg:block">Severity</span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Status</span>
          <div />
        </div>

        {incidentList.length > 0 ? incidentList.map((incident: any) => (
          <div 
            key={incident.id}
            onClick={() => setSelectedIncidentId(incident.id)}
            className={cn(
              "grid grid-cols-[400px_200px_100px_1fr_40px] gap-8 px-4 h-16 hover:bg-white/[0.02] border-b border-white/5 transition-all group cursor-pointer items-center relative",
              selectedIncidentId === incident.id && "bg-white/[0.04]"
            )}
          >
            {selectedIncidentId === incident.id && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500" />
            )}
            
            <div className="flex flex-col min-w-0 pr-4">
               <span className="text-[13px] font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors truncate">
                 {incident.title}
               </span>
               <div className="flex items-center gap-2 mt-0.5 shrink-0">
                 <Database className="w-3 h-3 text-zinc-700" />
                 <span className="text-[11px] text-zinc-600 font-medium truncate">{incident.repository.name}</span>
                 <span className="text-[10px] text-zinc-800">•</span>
                 <span className="text-[10px] text-zinc-700 font-mono">#{incident.id.substring(0, 8)}</span>
               </div>
            </div>

            <div className="hidden md:flex flex-col min-w-0 pr-4">
               <div className="flex items-center gap-1.5 shrink-0">
                 <GitBranch className="w-3 h-3 text-zinc-700" />
                 <span className="text-[11px] text-zinc-500 font-medium truncate">{incident.workflowRun.branch}</span>
               </div>
               <span className="text-[10px] text-zinc-700 mt-1 uppercase tracking-tighter shrink-0">
                 {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
               </span>
            </div>

            <div className="hidden lg:block shrink-0">
               <span className={cn(
                 "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                 incident.severity === 'high' 
                   ? "bg-red-500/10 text-red-500 border-red-500/20" 
                   : "bg-amber-500/10 text-amber-500 border-amber-500/20"
               )}>
                 {incident.severity}
               </span>
            </div>

            <div className="flex items-center justify-end gap-3 min-w-0">
               <StatusBadge 
                 status={incident.status} 
                 className="shrink-0 h-6 px-2 text-[9px]"
               />
               {incident.issues?.length > 0 && (
                 <div className="flex items-center gap-2 shrink-0">
                   <span className="text-zinc-800 text-[10px]">•</span>
                   <div className="flex items-center gap-1.5 text-red-500/80 font-bold uppercase tracking-widest text-[9px]">
                     <AlertTriangle className="w-3 h-3" />
                     <span>{incident.issues.length} Issues</span>
                   </div>
                 </div>
               )}
            </div>

            <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="w-4 h-4 text-zinc-700" />
            </div>
          </div>
        )) : (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-2xl mt-4 bg-white/[0.01]">
             <ShieldCheck className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
             <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">All systems nominal</p>
             <p className="text-zinc-800 text-[10px] mt-2 max-w-xs mx-auto">No incidents detected in the current remediation perimeter.</p>
          </div>
        )}
      </div>

      {/* Detail Drawer - Re-styled for premium feel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-[850px] bg-[#080808] border-l border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] transition-transform duration-500 ease-in-out z-50 flex flex-col",
        selectedIncidentId ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedIncident && (
          <>
            {/* Drawer Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01] sticky top-0 z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedIncident.title}</h3>
                  <StatusBadge status={selectedIncident.status} className="text-[9px] px-2" />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  <span>ID: {selectedIncident.id}</span>
                  <span className="text-zinc-800">•</span>
                  <span>Detected {format(new Date(selectedIncident.createdAt), 'PPP p')}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest border-white/5 bg-white/[0.02] text-zinc-400 gap-2 hover:text-white" onClick={handleViewLogs}>
                  <Terminal className="w-4 h-4" />
                  Terminal Logs
                </Button>
                <button 
                  onClick={() => setSelectedIncidentId(null)}
                  className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-32 custom-scrollbar">
              
              {/* Context Summary */}
              <div className="grid grid-cols-3 gap-4">
                 <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Repository</span>
                    <p className="text-xs font-bold text-zinc-300 truncate">{selectedIncident.repository.fullName}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Workflow Target</span>
                    <p className="text-xs font-bold text-zinc-300 truncate">{selectedIncident.workflowRun.workflow.name}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Execution Branch</span>
                    <div className="flex items-center gap-2">
                       <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                       <p className="text-xs font-bold text-zinc-300 font-mono">{selectedIncident.workflowRun.branch}</p>
                    </div>
                 </div>
              </div>

              {/* Timeline Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                   <Clock className="w-3.5 h-3.5" />
                   Lifecycle Timeline
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-8">
                  <Timeline items={incidentTimeline} />
                </div>
              </section>

              {/* Identified Issues */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Identified Issues
                  </div>
                  <Button 
                    size="sm" 
                    className={cn(
                      "h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl transition-all shadow-xl",
                      analysis ? "bg-white text-black hover:bg-zinc-200" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10"
                    )}
                    onClick={() => handleRunRCA()} 
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                    {analysis ? 'Force Re-Diagnosis' : 'Initialize Autonomous Diagnosis'}
                  </Button>
                </div>

                {issues && issues.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {issues.map((issue: any) => (
                      <IssueCard 
                        key={issue.id} 
                        issue={issue} 
                        onApplyFix={handleApplyFix}
                        onApprove={handleApprove}
                        onCreatePR={handleCreatePR}
                        onIgnore={handleIgnore}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01] space-y-6">
                    <div className="relative inline-block">
                       <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse" />
                       <BrainCircuit className="w-16 h-16 text-zinc-800 mx-auto relative z-10" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Neural engine standby</p>
                       <p className="text-zinc-700 text-[10px] max-w-xs mx-auto">No structured issues have been extracted from the runtime logs yet.</p>
                    </div>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] h-12 px-8 rounded-2xl shadow-xl shadow-blue-500/10"
                      onClick={() => handleRunRCA()}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : null}
                      Initiate Diagnosis
                    </Button>
                  </div>
                )}
              </section>

            </div>
          </>
        )}
      </div>

      {/* Overlay */}
      {selectedIncidentId && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-all duration-500"
          onClick={() => setSelectedIncidentId(null)}
        />
      )}
    </div>
  )
}
