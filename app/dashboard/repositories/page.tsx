'use client'

import React, { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { 
  Database, 
  RefreshCw, 
  GitBranch,
  ArrowRight,
  Zap,
  ShieldCheck,
  Activity,
  Search,
  MoreVertical,
  ExternalLink,
  Plus,
  Loader2,
  X,
  Check,
  Star,
  Lock,
  Globe,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/standard/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function RepositoriesPage() {
  const { data, isLoading } = useSWR('/api/repositories', fetcher)
  const [syncingRepos, setSyncingRepos] = useState<Record<string, boolean>>({})
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [availableRepos, setAvailableRepos] = useState<any[]>([])
  const [isFetchingRepos, setIsFetchingRepos] = useState(false)
  const [isAddingRepo, setIsAddingRepo] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)

  const repositories = data?.repositories || []
  
  const handleRepoSync = async (e: React.MouseEvent, repoId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSyncingRepos(prev => ({ ...prev, [repoId]: true }))
    try {
      await fetch(`/api/repositories/${repoId}/sync`, { method: 'POST' })
      mutate('/api/repositories')
    } catch (err) {
      console.error(err)
    } finally {
      setSyncingRepos(prev => ({ ...prev, [repoId]: false }))
    }
  }

  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true)
    setIsFetchingRepos(true)
    try {
      const res = await fetch('/api/github/repositories')
      if (res.ok) {
        const data = await res.json()
        setAvailableRepos(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetchingRepos(false)
    }
  }

  const handleAddRepo = async () => {
    if (!selectedRepoId) return
    setIsAddingRepo(true)
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubId: selectedRepoId })
      })
      if (res.ok) {
        mutate('/api/repositories')
        setIsAddModalOpen(false)
        setSelectedRepoId(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsAddingRepo(false)
    }
  }

  const formatSafeDate = (date: string | null | undefined) => {
    if (!date) return 'Never'
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return 'Never'
      return formatDistanceToNow(d, { addSuffix: true })
    } catch (e) {
      return 'Never'
    }
  }

  const filteredRepos = availableRepos.filter(repo => 
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !repositories.some((r: any) => r.githubId === repo.id)
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
          <Database className="w-4 h-4 text-zinc-500 animate-pulse" />
        </div>
        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Loading Repositories...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-8 lg:px-12 space-y-16">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">Repositories</h1>
          <p className="text-zinc-500 text-sm">Manage connected codebases and automation pipelines.</p>
        </div>
        <Button 
          onClick={handleOpenAddModal}
          className="bg-white text-black hover:bg-zinc-200 h-9 px-4 rounded-lg font-bold text-[11px] uppercase tracking-wider gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </Button>
      </div>

      {/* Simplified Repository List */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-4 pb-4 border-b border-white/5">
           <div className="flex items-center gap-12">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest min-w-[300px]">Repository</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden md:block">Branch</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden lg:block">Workflows</span>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden lg:block">Incidents</span>
           </div>
           <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Status</span>
        </div>

        {repositories.length > 0 ? repositories.map((repo: any) => (
          <div 
            key={repo.id}
            className="flex items-center justify-between p-4 hover:bg-white/[0.02] border-b border-white/5 transition-all group"
          >
            <div className="flex items-center gap-12">
               <div className="flex flex-col min-w-[300px]">
                  <Link href={`/dashboard/failures?repo=${repo.id}`} className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors">
                    {repo.name}
                  </Link>
                  <span className="text-[11px] text-zinc-600 font-mono">{repo.fullName}</span>
               </div>

               <div className="hidden md:flex items-center gap-2 min-w-[100px]">
                  <GitBranch className="w-3 h-3 text-zinc-700" />
                  <span className="text-xs text-zinc-500 font-medium">{repo.defaultBranch}</span>
               </div>

               <div className="hidden lg:block min-w-[80px]">
                  <span className="text-xs text-zinc-500 font-medium">{repo.workflows?.length || 0}</span>
               </div>

               <div className="hidden lg:block min-w-[80px]">
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    repo.activeIncidentsCount > 0 ? "text-red-500/80" : "text-zinc-700"
                  )}>
                    {repo.activeIncidentsCount}
                  </span>
               </div>
            </div>

            <div className="flex items-center gap-8">
               <div className="flex flex-col items-end">
                  <StatusBadge 
                    status={repo.activeIncidentsCount > 0 ? 'warning' : 'success'} 
                    label={repo.activeIncidentsCount > 0 ? 'Needs Attention' : 'Healthy'}
                    className="text-[8px] px-2 py-0 h-5"
                  />
                  <span className="text-[9px] text-zinc-700 mt-1 uppercase tracking-tighter">Synced {formatSafeDate(repo.syncedAt)}</span>
               </div>

               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest px-2" asChild>
                    <Link href={`/dashboard/failures?repo=${repo.id}`}>View</Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-zinc-500 hover:text-white"
                    onClick={(e) => handleRepoSync(e, repo.id)}
                    disabled={syncingRepos[repo.id]}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", syncingRepos[repo.id] && "animate-spin text-blue-500")} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-zinc-500 hover:text-blue-500">
                    <Zap className="w-3.5 h-3.5" />
                  </Button>
               </div>
            </div>
          </div>
        )) : (
          <div className="py-12 text-center border border-dashed border-white/5 rounded-xl mt-4">
             <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">No repositories added</p>
          </div>
        )}
      </div>

      {/* Add Repository Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh] relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-blue-500" />
                   </div>
                   Add Repository
                </h2>
                <p className="text-xs text-zinc-500">Initialize a new perimeter for autonomous remediation.</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-8 space-y-6 flex-1 overflow-hidden flex flex-col">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter available codebases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-700"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-3 space-y-3 custom-scrollbar min-h-[400px]">
                {isFetchingRepos ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <div className="relative">
                       <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                       <Loader2 className="w-8 h-8 text-blue-500 animate-spin relative z-10" />
                    </div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Synchronizing with GitHub...</p>
                  </div>
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => setSelectedRepoId(repo.id)}
                      className={cn(
                        "w-full p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                        selectedRepoId === repo.id 
                          ? "bg-blue-600/5 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.05)]" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]"
                      )}
                    >
                      {selectedRepoId === repo.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      )}
                      
                      <div className="flex items-start justify-between">
                         <div className="flex gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                              selectedRepoId === repo.id 
                                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                                : "bg-zinc-900 text-zinc-500 group-hover:text-zinc-300 group-hover:bg-zinc-800"
                            )}>
                              <Database className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-white tracking-tight">{repo.name}</p>
                                  {repo.private ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase tracking-widest">
                                       <Lock className="w-2 h-2" /> Private
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                                       <Globe className="w-2 h-2" /> Public
                                    </span>
                                  )}
                               </div>
                               <p className="text-[11px] text-zinc-600 font-mono group-hover:text-zinc-500 transition-colors">{repo.full_name}</p>
                               {repo.description && (
                                 <p className="text-[11px] text-zinc-500 mt-2 line-clamp-1 max-w-[320px]">{repo.description}</p>
                               )}
                            </div>
                         </div>

                         <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-3">
                               {repo.language && (
                                 <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{repo.language}</span>
                                 </div>
                               )}
                               <div className="flex items-center gap-1.5">
                                  <Star className="w-3 h-3 text-zinc-700" />
                                  <span className="text-[10px] font-bold text-zinc-600 tabular-nums">{repo.stargazers_count}</span>
                               </div>
                            </div>
                            {selectedRepoId === repo.id && (
                               <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center animate-in zoom-in duration-200">
                                  <Check className="w-3 h-3 text-white" />
                               </div>
                            )}
                         </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-50 text-center">
                    <Search className="w-12 h-12 text-zinc-800" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">No deployments found</p>
                      <p className="text-xs text-zinc-700 max-w-[200px]">We couldn't find any repositories matching your criteria.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-white/[0.01] border-t border-white/5 flex gap-4">
              <Button 
                variant="ghost"
                className="flex-1 h-12 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 rounded-xl transition-all"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className={cn(
                  "flex-1 h-12 font-black uppercase tracking-[0.1em] text-[10px] gap-2 rounded-xl transition-all duration-300 shadow-xl",
                  selectedRepoId 
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10" 
                    : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                )}
                disabled={!selectedRepoId || isAddingRepo}
                onClick={handleAddRepo}
              >
                {isAddingRepo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Deploy Perimeter
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
