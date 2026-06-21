'use client'

import React, { useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle2, 
  BrainCircuit, 
  Zap, 
  Eye, 
  GitPullRequest, 
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PatchDiffViewer } from '@/components/patch-diff-viewer'
import { StatusBadge } from '@/components/standard/status-badge'

interface Issue {
  id: string
  type: string
  severity: string
  category: string
  file: string
  line?: number
  title: string
  rootCause: string
  manualFix: string
  aiFixSummary: string
  confidence: number
  status: string
  patches: any[]
}

interface IssueCardProps {
  issue: Issue
  onApplyFix: (id: string) => Promise<void>
  onApprove: (id: string, patchId: string) => Promise<void>
  onCreatePR: (id: string) => Promise<void>
  onIgnore: (id: string) => Promise<void>
}

export function IssueCard({ issue, onApplyFix, onApprove, onCreatePR, onIgnore }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPatch, setShowPatch] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isCreatingPR, setIsCreatingPR] = useState(false)
  const [error, setError] = useState<{ message: string, code?: string } | null>(null)

  const latestPatch = issue.patches?.[0]
  const latestFix = (issue as any).fixes?.[0]
  
  console.log(`[UI_AUDIT] IssueCard render - issue id: ${issue.id}`);
  console.log(`[UI_AUDIT] fixes count: ${(issue as any).fixes?.length || 0}`);
  console.log(`[UI_AUDIT] patches count: ${issue.patches?.length || 0}`);
  console.log(`[UI_AUDIT] fix attached: ${!!latestFix}`);
  
  if (latestPatch && showPatch) {
    console.log(`[UI_AUDIT] rendering patch review`);
  }

  const isApproved = issue.status === 'APPROVED' || latestPatch?.status === 'APPROVED'
  const isPrCreated = issue.status === 'PR_CREATED'
  const isActionable = issue.type === 'FAILURE'

  const handleApplyFix = async () => {
    setIsFixing(true)
    setError(null)
    let fixGenerated = false;
    
    try {
      // 1. Generate Fix Plan
      const resFix = await fetch(`/api/issues/${issue.id}/generate-fix`, { method: 'POST' })
      if (!resFix.ok) {
         const data = await resFix.json()
         throw data
      }
      const fixData = await resFix.json()
      fixGenerated = true;

      // 2. Generate Diff based on the plan
      const resDiff = await fetch(`/api/issues/${issue.id}/generate-diff`, { 
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ issueFixId: fixData.id })
      })
      
      if (!resDiff.ok) {
         const data = await resDiff.json()
         throw data
      }
      
      // Successfully generated both fix and patch
      await onApplyFix(issue.id) // This can just trigger the SWR mutate now
      setShowPatch(true) // Automatically show the generated patch
      setIsExpanded(true)
      
    } catch (err: any) {
      setError({ 
        message: fixGenerated 
          ? "Fix generated successfully but diff generation failed." 
          : err.reason || err.message || "Failed to generate fix", 
        code: err.code 
      })
      if (fixGenerated && err.reason) {
          console.error(`Diff Generation Blocked: ${err.reason}`);
      }
    } finally {
      setIsFixing(false)
    }
  }

  const handleApprove = async () => {
    if (!latestPatch) return
    setIsApproving(true)
    await onApprove(issue.id, latestPatch.id)
    setIsApproving(false)
  }

  const handleCreatePR = async () => {
    setIsCreatingPR(true)
    await onCreatePR(issue.id)
    setIsCreatingPR(false)
  }

  return (
    <div className={cn(
      "group rounded-2xl border transition-all duration-300 overflow-hidden bg-zinc-950/50",
      issue.type === 'FAILURE' 
        ? (issue.severity === 'CRITICAL' ? "border-red-500/20 hover:border-red-500/40" : "border-zinc-800 hover:border-zinc-700")
        : (issue.type === 'WARNING' ? "border-amber-500/10 hover:border-amber-500/20" : "border-blue-500/10 hover:border-blue-500/20")
    )}>
      {/* Header */}
      <div 
        className="p-5 cursor-pointer flex items-start justify-between gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            issue.type === 'FAILURE' 
              ? (issue.severity === 'CRITICAL' ? "bg-red-500/10 text-red-500" : "bg-zinc-900 text-zinc-500")
              : (issue.type === 'WARNING' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500")
          )}>
            {issue.type === 'FAILURE' ? <AlertTriangle className="w-4 h-4" /> : 
             issue.type === 'WARNING' ? <AlertTriangle className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">{issue.title}</h3>
              <span className={cn(
                "px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest border",
                issue.type === 'FAILURE' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                issue.type === 'WARNING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}>
                {issue.type}
              </span>
              <StatusBadge status={issue.status} className="text-[8px]" />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <FileIcon className="w-3 h-3" /> {issue.file}{issue.line ? `:${issue.line}` : ''}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <span className="uppercase tracking-widest">{issue.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Confidence</p>
            <p className="text-xs font-black text-white">{issue.confidence}%</p>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-6 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-zinc-900">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-3 h-3 text-blue-500" /> Root Cause
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-zinc-900">
                {issue.rootCause}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Manual Fix
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-zinc-900">
                {issue.manualFix}
              </p>
            </div>
          </div>

          {/* AI Fix Summary - Only for FAILURE or if patch exists */}
          {(issue.type === 'FAILURE' || latestPatch) && (
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Fix Strategy</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{issue.aiFixSummary}</p>
              </div>
            </div>
          )}

          {/* Patch Preview */}
          {latestPatch && showPatch && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-3 h-3" /> Patch Review
              </h4>
              <PatchDiffViewer diff={latestPatch.diff} fileName={issue.file} />
              
              {!isApproved && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-[9px] h-9"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                    Approve Fix
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/5 font-bold uppercase tracking-widest text-[9px] h-9"
                    onClick={() => setShowPatch(false)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-in fade-in zoom-in-95">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Remediation Blocked</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{error.message}</p>
                  {error.code && <p className="text-[9px] font-mono text-zinc-600 uppercase">Code: {error.code}</p>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-900">
            {isPrCreated ? (
              <Button 
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
                onClick={() => window.open(latestPatch?.prUrl, '_blank')}
              >
                <GitPullRequest className="w-4 h-4" /> Open Pull Request
              </Button>
            ) : isApproved ? (
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
                onClick={handleCreatePR}
                disabled={isCreatingPR}
              >
                {isCreatingPR ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />} Create PR
              </Button>
            ) : latestPatch ? (
              <Button 
                className="bg-white text-black hover:bg-zinc-200 h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
                onClick={() => setShowPatch(!showPatch)}
              >
                <Eye className="w-4 h-4" /> {showPatch ? 'Hide Patch' : 'View Patch'}
              </Button>
            ) : isActionable ? (
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
                onClick={handleApplyFix}
                disabled={isFixing}
              >
                {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Apply AI Fix
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-zinc-900 border border-zinc-800">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Informational issue - no remediation required</span>
              </div>
            )}
            
            <Button variant="outline" className="h-10 border-zinc-800 text-zinc-500 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => onIgnore(issue.id)}>
              Ignore
            </Button>
            
            <Button variant="ghost" className="h-10 text-zinc-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest ml-auto">
              Create GitHub Issue
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
