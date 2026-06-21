'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { GitBranch, Check, Loader2, Rocket, Shield, Zap, Search, Database, BrainCircuit, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [repos, setRepos] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if ((session?.user as any)?.onboardingCompleted) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'loading') return

    async function fetchRepos() {
      if (hasFetched) return

      try {
        const res = await fetch('/api/github/repositories')
        if (res.ok) {
          const data = await res.json()
          setRepos(data.repositories || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setHasFetched(true)
      }
    }

    if ((session?.user as any)?.githubConnected && step === 2) {
      fetchRepos()
    }
  }, [session, step, status, hasFetched])

  const handleConnectGithub = () => {
    window.location.href = '/api/auth/signin/github'
  }

  const handleCompleteOnboarding = async () => {
    if (!selectedRepo) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: selectedRepo })
      })

      if (res.ok) {
        await update({ onboardingCompleted: true })
        router.push('/dashboard')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.1),transparent_70%)]" />
      
      <Card className="w-full max-w-2xl border-white/10 bg-zinc-950 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-8 border-b border-white/5">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
            Initialize <span className="text-blue-500">CORI</span>
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            Let's configure your autonomous remediation perimeter.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-10 px-10">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                  step >= i ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                )}>
                  {step > i ? <Check className="w-4 h-4" /> : i}
                </div>
                {i < 3 && <div className={cn("w-12 h-[1px]", step > i ? "bg-blue-600" : "bg-zinc-800")} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white tracking-tight">Connect your workspace</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  CORI needs access to your GitHub repositories to monitor workflow runs and propose fixes.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Secure Access</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">We only request permissions required for PR creation and log reading.</p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-500" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Real-time RCA</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">Agent monitors actions and starts analysis the moment a failure occurs.</p>
                </div>
              </div>

              <Button 
                onClick={handleConnectGithub}
                className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] gap-3 rounded-xl shadow-xl shadow-white/5"
              >
                <GitBranch className="w-5 h-5" />
                Authorize GitHub
              </Button>
              
              {(session?.user as any)?.githubConnected && (
                <div className="flex items-center justify-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Connection Verified</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white tracking-tight">Select target perimeter</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Choose the repository you want CORI to monitor and remediate.
                </p>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter repositories..."
                  className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-700"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {repos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border flex items-center justify-between transition-all group",
                      selectedRepo === repo.id 
                        ? "bg-blue-600/10 border-blue-500/50" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                         selectedRepo === repo.id ? "bg-blue-500 text-white" : "bg-zinc-900 text-zinc-500 group-hover:text-zinc-300"
                       )}>
                         <Database className="w-5 h-5" />
                       </div>
                       <div className="text-left">
                         <p className="text-xs font-bold text-white">{repo.name}</p>
                         <p className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors">{repo.fullName}</p>
                       </div>
                    </div>
                    {selectedRepo === repo.id && <Check className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="relative inline-block">
                  <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20 animate-pulse" />
                  <div className="relative w-24 h-24 rounded-3xl bg-zinc-900 border border-blue-500/30 flex items-center justify-center mx-auto mb-8">
                     <BrainCircuit className="w-12 h-12 text-blue-500" />
                  </div>
               </div>
               <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white tracking-tight">Perimeter Locked</h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">
                  Neural engine is ready to sync with your CI pipeline. We will begin monitoring for failures immediately.
                </p>
              </div>
              
              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl max-w-sm mx-auto">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    <span>Selected Repo</span>
                    <span className="text-blue-500">Verified</span>
                 </div>
                 <p className="text-xs font-mono text-zinc-300">{repos.find(r => r.id === selectedRepo)?.name}</p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-10 border-t border-white/5 bg-white/[0.01]">
          <Button 
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl"
            disabled={isLoading || (step === 2 && !selectedRepo)}
            onClick={() => {
              if (step < 3) {
                if (step === 1 && !(session?.user as any)?.githubConnected) {
                  handleConnectGithub()
                } else {
                  setStep(step + 1)
                }
              } else {
                handleCompleteOnboarding()
              }
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synchronizing...
              </>
            ) : step < 3 ? (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Start Monitoring
                <Check className="w-4 h-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
