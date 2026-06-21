'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  User, 
  GitPullRequest, 
  Zap, 
  Database, 
  RefreshCw, 
  Trash2, 
  LogOut,
  AlertTriangle,
  Globe,
  Shield,
  Monitor,
  CheckCircle2,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/standard/page-header'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

type Section = 'account' | 'github' | 'remediation' | 'system'

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const activeSection = (searchParams.get('section') as Section) || 'account'
  
  const setActiveSection = (section: Section) => {
    const params = new URLSearchParams(searchParams)
    params.set('section', section)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch (error) {
      toast.error('Failed to load settings')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function updateSetting(key: string, value: any) {
    try {
      setSaving(true)
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          remediation: { ...prev.remediation, [key]: value },
          account: key === 'name' ? { ...prev.account, name: value } : prev.account
        }))
        toast.success('Configuration Synchronized')
      }
    } catch (error) {
      toast.error('Sync Failure')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    try {
      setSyncing(true)
      const res = await fetch('/api/github/sync', { method: 'POST', body: JSON.stringify({}) })
      if (res.ok) {
        toast.success('GitHub Metadata Synchronized')
        fetchSettings()
      }
    } catch (error) {
      toast.error('GitHub Sync Error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleReset() {
    if (!confirm('INITIATE FACTORY RESET? All repository data and incident analysis logs will be purged permanently.')) return
    
    try {
      setResetting(true)
      const res = await fetch('/api/system/reset', { method: 'POST' })
      if (res.ok) {
        toast.success('Workspace Purge Complete')
        window.location.href = '/dashboard/onboarding'
      }
    } catch (error) {
      toast.error('Reset Protocol Failed')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Activity className="w-5 h-5 text-zinc-500 animate-pulse" />
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Querying State...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center">
        <div className="w-12 h-12 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500/50" />
        </div>
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Database Connection Fault</h3>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider max-w-xs leading-relaxed">System failed to retrieve workspace configuration parameters.</p>
        </div>
        <Button onClick={fetchSettings} variant="outline" size="sm" className="border-white/5 bg-white/[0.02] text-zinc-400 font-bold uppercase tracking-widest h-9 px-6 hover:bg-white/[0.05]">
          Re-initialize
        </Button>
      </div>
    )
  }

  const sections = [
    { id: 'account', label: 'Identity & Session', icon: User, description: 'Core user profile and authentication context.' },
    { id: 'github', label: 'GitHub Integration', icon: GitPullRequest, description: 'Source code management and API synchronization.' },
    { id: 'remediation', label: 'Operator Automation', icon: Zap, description: 'Autonomous remediation engine thresholds.' },
    { id: 'system', label: 'Platform Controls', icon: Database, description: 'Workspace maintenance and system-level actions.' },
  ] as const

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10 space-y-12">
      <PageHeader 
        title="Settings" 
        description="Workspace configuration and automation protocol management."
      />

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="sticky top-10 space-y-2">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-4">Workspace Index</span>
            <nav className="flex flex-col gap-0.5">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-150 group",
                    activeSection === section.id
                      ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      activeSection === section.id ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"
                    )} />
                    {section.label}
                  </div>
                  {activeSection === section.id && <ChevronRight className="w-3 h-3 text-zinc-600" />}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl">
          <div className="mb-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
               {activeSection === 'account' && <User className="w-3 h-3" />}
               {activeSection === 'github' && <GitPullRequest className="w-3 h-3" />}
               {activeSection === 'remediation' && <Zap className="w-3 h-3" />}
               {activeSection === 'system' && <Database className="w-3 h-3" />}
               {sections.find(s => s.id === activeSection)?.label}
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
              {activeSection} Configuration
            </h2>
          </div>

          <div className="space-y-12 pb-24">
            {activeSection === 'account' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Public Profile</span>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl divide-y divide-white/5">
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Display Identifier</Label>
                        <p className="text-[10px] text-zinc-600 uppercase font-medium">Internal name used across incident analysis reports.</p>
                      </div>
                      <Input 
                        defaultValue={data.account.name}
                        onBlur={(e) => updateSetting('name', e.target.value)}
                        className="md:max-w-[280px] bg-black border-white/5 text-[12px] text-zinc-300 focus:border-blue-500/50 focus:ring-0 h-10 px-4 transition-all"
                      />
                    </div>
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Authentication Alias</Label>
                        <p className="text-[10px] text-zinc-600 uppercase font-medium">Primary identity for platform access and session management.</p>
                      </div>
                      <div className="flex items-center gap-3 md:max-w-[280px] w-full">
                        <Input 
                          value={data.account.email}
                          disabled
                          className="bg-black border-white/5 text-[12px] text-zinc-600 cursor-not-allowed h-10 px-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Session Control</span>
                  <div className="bg-red-500/[0.01] border border-red-500/10 rounded-xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Terminate Current Session</h4>
                      <p className="text-[10px] text-zinc-600 uppercase font-medium max-w-md leading-relaxed">Securely end access and invalidate local authentication tokens.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => signOut()}
                      className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold uppercase text-[11px] tracking-[0.2em] h-11 px-8 rounded-lg"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'github' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Connection Status</span>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-10">
                      <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-2xl bg-[#080808] border border-white/5 flex items-center justify-center shadow-2xl relative z-10">
                            <GitPullRequest className="w-10 h-10 text-white" />
                          </div>
                          <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full z-0" />
                          {data.github.connected && (
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 border-[6px] border-[#050505] flex items-center justify-center shadow-xl z-20">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 text-center md:text-left">
                          <div className="flex flex-col md:flex-row items-center gap-3">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">
                              {data.account.githubUsername ? `@${data.account.githubUsername}` : 'Identity Offline'}
                            </h3>
                            {data.github.connected ? (
                              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1">Active Sync</Badge>
                            ) : (
                              <Badge variant="outline" className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 border-white/5">Link Required</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-center md:justify-start gap-4 text-zinc-500">
                            <div className="flex items-center gap-2">
                               <Database className="w-3.5 h-3.5" />
                               <span className="text-[11px] font-bold uppercase tracking-wider tabular-nums">{data.github.repositoryCount} Repositories</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <div className="flex items-center gap-2">
                               <Globe className="w-3.5 h-3.5" />
                               <span className="text-[11px] font-bold uppercase tracking-wider">Global Scope</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 w-full md:w-auto">
                        <Button variant="outline" className="border-white/10 bg-white/[0.02] text-white font-bold uppercase text-[10px] tracking-widest h-11 px-8 rounded-xl hover:bg-white/[0.05] transition-all">
                          Re-authorize
                        </Button>
                        <Button variant="ghost" className="text-zinc-600 hover:text-red-400 font-bold uppercase text-[10px] tracking-widest transition-colors h-11">
                          Sever Connection
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-5 group hover:bg-white/[0.03] transition-all cursor-default">
                    <div className="w-12 h-12 rounded-lg bg-black border border-white/5 flex items-center justify-center group-hover:border-blue-500/30 transition-colors">
                      <Globe className="w-5 h-5 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Event Webhooks</h4>
                      <p className="text-[10px] text-zinc-600 uppercase font-medium">Real-time CI/CD payload delivery.</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-5 group hover:bg-white/[0.03] transition-all cursor-default">
                    <div className="w-12 h-12 rounded-lg bg-black border border-white/5 flex items-center justify-center group-hover:border-blue-500/30 transition-colors">
                      <Shield className="w-5 h-5 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Access Scope</h4>
                      <p className="text-[10px] text-zinc-600 uppercase font-medium">Read/Write Permission context.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'remediation' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Automation Policy</span>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 flex items-center justify-between gap-10 group hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-white uppercase tracking-tight flex items-center gap-2">
                          Autonomous PR Deployment
                          <Shield className="w-3.5 h-3.5 text-zinc-600" />
                        </Label>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium max-w-lg leading-relaxed">Open GitHub PRs immediately upon patch verification. Bypasses manual review stage.</p>
                      </div>
                      <button 
                        onClick={() => updateSetting('autoPRCreation', !data.remediation.autoPRCreation)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all duration-300 relative border",
                          data.remediation.autoPRCreation 
                            ? "bg-blue-600 border-blue-500" 
                            : "bg-black border-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3.5 h-3.5 rounded-full transition-all duration-300",
                          data.remediation.autoPRCreation ? "left-7 bg-white shadow-xl" : "left-1.5 bg-zinc-700"
                        )} />
                      </button>
                    </div>
                    
                    <div className="p-8 flex items-center justify-between gap-10 group hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-white uppercase tracking-tight">Deep Verification Protocol</Label>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium max-w-lg leading-relaxed">Execute exhaustive sandbox builds and unit test suites to confirm patch integrity.</p>
                      </div>
                      <button 
                        onClick={() => updateSetting('autoVerification', !data.remediation.autoVerification)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all duration-300 relative border",
                          data.remediation.autoVerification 
                            ? "bg-blue-600 border-blue-500" 
                            : "bg-black border-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3.5 h-3.5 rounded-full transition-all duration-300",
                          data.remediation.autoVerification ? "left-7 bg-white shadow-xl" : "left-1.5 bg-zinc-700"
                        )} />
                      </button>
                    </div>

                    <div className="p-8 flex items-center justify-between gap-10 group hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-white uppercase tracking-tight">Operator Intercept Required</Label>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium max-w-lg leading-relaxed">Forces human approval before any write actions to source control are executed.</p>
                      </div>
                      <button 
                        onClick={() => updateSetting('manualApprovalRequired', !data.remediation.manualApprovalRequired)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all duration-300 relative border",
                          data.remediation.manualApprovalRequired 
                            ? "bg-blue-600 border-blue-500" 
                            : "bg-black border-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3.5 h-3.5 rounded-full transition-all duration-300",
                          data.remediation.manualApprovalRequired ? "left-7 bg-white shadow-xl" : "left-1.5 bg-zinc-700"
                        )} />
                      </button>
                    </div>

                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-10 group hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-white uppercase tracking-tight">AI Confidence Threshold</Label>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium max-w-lg leading-relaxed">Minimum probability score required for the operator to initiate autonomous remediation.</p>
                      </div>
                      <div className="flex items-center gap-4 bg-black p-2 rounded-xl border border-white/5">
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          value={data.remediation.confidenceThreshold}
                          onChange={(e) => setData({ ...data, remediation: { ...data.remediation, confidenceThreshold: parseInt(e.target.value) } })}
                          onBlur={(e) => updateSetting('confidenceThreshold', parseInt(e.target.value))}
                          className="w-24 bg-[#050505] border-white/5 text-[15px] font-bold text-blue-500 h-10 text-center focus:border-blue-500 transition-all tabular-nums"
                        />
                        <span className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.3em] mr-4">Percent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'system' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-white/[0.01] border border-white/5 rounded-2xl space-y-6 hover:bg-white/[0.03] hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-xl bg-black border border-white/5 flex items-center justify-center shadow-xl group-hover:border-blue-500/30 transition-colors">
                        <RefreshCw className={cn("w-6 h-6 text-zinc-500 transition-colors group-hover:text-blue-500", syncing && "animate-spin")} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Metadata Sync</h4>
                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Synchronize GitHub object state.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleSync}
                      disabled={syncing}
                      className="w-full border-white/5 bg-white/[0.02] text-zinc-400 font-black uppercase text-[10px] tracking-[0.2em] h-12 rounded-xl hover:bg-white/[0.1] hover:text-white transition-all shadow-lg"
                    >
                      {syncing ? 'Synchronizing...' : 'Initialize Full Sync'}
                    </Button>
                  </div>

                  <div className="p-8 bg-white/[0.01] border border-white/5 rounded-2xl space-y-6 hover:bg-white/[0.03] hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-xl bg-black border border-white/5 flex items-center justify-center shadow-xl group-hover:border-amber-500/30 transition-colors">
                        <Monitor className="w-6 h-6 text-zinc-500 transition-colors group-hover:text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Cache Purge</h4>
                        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">Flush ephemeral analysis logs.</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => toast.success('Workspace Cache Purged')}
                      className="w-full border-white/5 bg-white/[0.02] text-zinc-400 font-black uppercase text-[10px] tracking-[0.2em] h-12 rounded-xl hover:bg-white/[0.1] hover:text-white transition-all shadow-lg"
                    >
                      Flush Cache
                    </Button>
                  </div>
                </div>

                <div className="p-10 rounded-2xl border border-red-500/10 bg-red-500/[0.01] space-y-8 relative overflow-hidden group hover:border-red-500/30 transition-all">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Trash2 className="w-48 h-48 text-red-500" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em]">Critical Protocol: Factory Reset</h3>
                    </div>
                    <p className="text-[12px] text-zinc-500 uppercase font-bold tracking-wider max-w-2xl leading-relaxed">
                      Irreversible purge of all repository connections, incident metadata, 
                      and analysis logs. Authorization required.
                    </p>
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        onClick={handleReset}
                        disabled={resetting}
                        className="border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase text-[11px] tracking-[0.4em] h-14 px-12 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                      >
                        {resetting ? 'PURGING...' : 'Initiate Workspace Purge'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 opacity-30">
        <div className="flex items-center gap-5">
          <div className="px-4 py-1.5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">
            Version 0.4.2-A
          </div>
          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.5em]">Module: Stella-S-Control</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-700">
           <Terminal className="w-3.5 h-3.5" />
           <p className="text-[9px] font-black uppercase tracking-[0.4em]">
             Autonomous Infrastructure Managed by CORI Engine v2.0
           </p>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 bg-[#050505]">
        <Activity className="w-5 h-5 text-zinc-500 animate-pulse" />
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Querying State...</span>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
