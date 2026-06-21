'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ChevronRight,
  Code2,
  Activity,
  Check,
  Play,
  Terminal,
  Cpu,
  Layers,
  HelpCircle,
  ShieldCheck,
  GitPullRequest,
  GitBranch,
  GitCommit,
  ExternalLink,
  Lock,
  ArrowUpRight,
  Settings,
  Database,
  Search,
  X,
  AlertCircle,
  Command,
  RefreshCw,
  Server,
  Radio,
  Sliders,
  History
} from 'lucide-react'

// Animations
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

// ----------------------------------------------------
// Section 2: Journey Steps
// ----------------------------------------------------
const JOURNEY_STEPS = [
  {
    id: 'detect',
    label: 'Incident Detected',
    tag: 'CI/CD Webhook',
    metric: 'Ingestion < 120ms',
    description: 'CORI listens to failure webhooks from GitHub, GitLab, and Vercel. Instantly extracts failure logs and execution environment variables.',
    outputType: 'JSON Webhook Payload',
    output: `{
  "event": "workflow_run",
  "status": "completed",
  "conclusion": "failure",
  "repository": {
    "name": "checkout-service",
    "owner": "stellaops"
  },
  "failed_jobs": ["build-and-test"]
}`
  },
  {
    id: 'analyze',
    label: 'Root Cause Analysis',
    tag: 'AST Compiler Parser',
    metric: 'Mapping Accuracy 99.4%',
    description: 'Runs deterministic compiler trace parsing. Maps stack outputs directly to lines, modules, and scope files in your code AST.',
    outputType: 'Trace Resolution',
    output: `[compiler] Isolated type compilation failure:
File: app/api/checkout/route.ts:45
Error: TS2339 - Property 'shippingAddress' does not exist on type 'UserSession | null'.
Context: Accessing member 'shippingAddress' on potentially null variable.`
  },
  {
    id: 'patch',
    label: 'Patch Generated',
    tag: 'Diff Compiler',
    metric: 'Speed ~2.1 seconds',
    description: 'Computes AST-compliant fixes matching your codebase style. Writes targeted, minimal code modifications with zero side-effects.',
    outputType: 'Git Unified Diff',
    output: `diff --git a/app/api/checkout/route.ts b/app/api/checkout/route.ts
--- a/app/api/checkout/route.ts
+++ b/app/api/checkout/route.ts
@@ -45,2 +45,2 @@
-  const address = session.user.shippingAddress;
+  const address = session.user?.shippingAddress ?? null;`
  },
  {
    id: 'sandbox',
    label: 'Verification Sandbox',
    tag: 'Docker Container',
    metric: 'Containment: Strict',
    description: 'Mounts a secure, network-isolated runner sandbox replicating your node environment. Tests the patch against build compiler and vitest suites.',
    outputType: 'Sandbox Run Outputs',
    output: `$ docker run --network=none -v /workspace:/app cori-sandbox
> next build && vitest run
✓ Compiling production bundle... Success (1.4s)
✓ Running checkouts test suite
✓ 12/12 unit tests passed. Exit Code: 0`
  },
  {
    id: 'pr',
    label: 'Pull Request Created',
    tag: 'GitHub App',
    metric: 'Checks Passed: 100%',
    description: 'Opens a structured branch commit and pull request on GitHub. Provides diagnostic trace audits, test outputs, and confidence ratings.',
    outputType: 'GitHub API Response',
    output: `POST /repos/stellaops/checkout-service/pulls
{
  "title": "fix(checkout): resolve nullable address compilation check",
  "body": "### CORI Incident Resolution Audit... [exit: 0] [tests: 12 passed]",
  "head": "cori/fix-checkout-address"
}`
  }
]

// ----------------------------------------------------
// Section 7: FAQ Spec
// ----------------------------------------------------
const FAQ_SPEC = [
  {
    q: 'How does CORI generate patches without breaking code style?',
    a: 'CORI parses your repository\'s AST configurations (e.g. tsconfig, eslint rules, prettier guides) and targets only nodes affected by the stack trace. The generated patches are minimal line-level diffs rather than full file rewrites.'
  },
  {
    q: 'Where are fixes compiled and verified?',
    a: 'Verification takes place in ephemeral, single-use Linux containers on our secure cloud nodes. The sandboxes are network-disabled, preventing data leakage, and running with hardware limit caps to prevent infinite loops.'
  },
  {
    q: 'Can our engineering team approve fixes before a PR is opened?',
    a: 'Yes. You can toggle auto-healing settings per repository. In "hold-mode," CORI verifies the patch in a sandbox and pauses on the dashboard queue for a one-click manual approval before creating the GitHub PR.'
  },
  {
    q: 'Does CORI support local self-hosted runner runners?',
    a: 'Absolutely. CORI integrates with existing GitHub Actions self-hosted runners, GitLab runners, or custom CI runners by receiving build logs directly via webhooks and API hooks.'
  },
  {
    q: 'How does the confidence score calculation work?',
    a: 'Confidence scores are computed deterministically based on three checks: (1) Exit status of local compilation (0 checks), (2) 100% test suite completion rate, and (3) Syntactic AST similarity index showing zero side-effect scopes.'
  }
]

export default function RedesignedLandingPage() {
  // Navigation - do not change the HTML structure or styling
  const [navbarStatus, setNavbarStatus] = useState('active')

  // Hero interactive state machine loop states
  const [heroState, setHeroState] = useState<'idle' | 'detecting' | 'analyzing' | 'patching' | 'verifying' | 'completed'>('idle')
  const [heroProgress, setHeroProgress] = useState(0)

  // Section 2: Journey tabs
  const [activeJourney, setActiveJourney] = useState('detect')

  // Section 3: Walkthrough state player
  const [walkthroughStep, setWalkthroughStep] = useState<number>(0) // 0: Idle, 1: Error, 2: Analysis, 3: Patch, 4: Sandbox, 5: PR
  
  // Section 5: Trust Sandbox Steps
  const [activeTrustStep, setActiveTrustStep] = useState<number>(0)

  // Section 6: Tabbed Showcase
  const [activeShowcase, setActiveShowcase] = useState<'command' | 'repos' | 'incidents' | 'sandbox' | 'prs'>('command')

  // Hero state loop controller
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroState((prev) => {
        switch (prev) {
          case 'idle':
            setHeroProgress(0)
            return 'detecting'
          case 'detecting':
            setHeroProgress(20)
            return 'analyzing'
          case 'analyzing':
            setHeroProgress(45)
            return 'patching'
          case 'patching':
            setHeroProgress(70)
            return 'verifying'
          case 'verifying':
            setHeroProgress(90)
            return 'completed'
          case 'completed':
            setHeroProgress(100)
            return 'idle'
          default:
            return 'idle'
        }
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // Walkthrough automatic state playback loop
  useEffect(() => {
    const timer = setInterval(() => {
      setWalkthroughStep((prev) => (prev >= 5 ? 0 : prev + 1))
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Trust pipeline automatic runner
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTrustStep((prev) => (prev >= 7 ? 0 : prev + 1))
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-blue-500/20 antialiased overflow-x-hidden relative">
      
      {/* Background Grids & Radial Glow System */}
      <div className="absolute inset-0 bg-grid-lines pointer-events-none opacity-[0.25] z-0" />
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[1800px] left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[200px] right-1/4 w-[700px] h-[700px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Floating Pill Navigation - PRESERVED AS IS */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-[90] w-[92%] max-w-5xl bg-zinc-950/70 backdrop-blur-md rounded-full px-5 py-2 flex items-center justify-between border border-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.8)] font-mono">
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:border-zinc-700 transition-colors">
            <Command className="w-3 h-3 text-blue-500" />
          </div>
          <span className="text-xs font-bold text-white tracking-wider">CORI</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <a href="#showcase" className="hover:text-white transition-colors">Platform</a>
          <a href="#verification" className="hover:text-white transition-colors">Safety</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 border border-zinc-900 rounded-full px-2.5 py-0.5 bg-black/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>sys_status: active</span>
          </div>
          <Link href="/login">
            <button className="h-7.5 px-4 bg-white hover:bg-zinc-200 text-zinc-950 text-[10px] font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer">
              Deploy CORI
            </button>
          </Link>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section className="relative z-10 pt-32 lg:pt-48 pb-24 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Value Prop */}
        <motion.div 
          className="lg:col-span-5 text-left space-y-6"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Autonomous Reliability Infrastructure</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
            Your Autonomous <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-450">Reliability Engineer.</span>
          </h1>
          
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg font-sans">
            CORI watches repositories, investigates failures, verifies fixes, and prepares pull requests before engineers even open the incident.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/login">
              <motion.button 
                className="h-11 px-6 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Deploy CORI
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <a href="#workflow">
              <motion.button 
                className="h-11 px-6 border border-zinc-900 bg-zinc-950/40 text-zinc-300 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 hover:text-white hover:border-zinc-800 cursor-pointer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                View Workflow
              </motion.button>
            </a>
          </div>

          <div className="pt-6 flex items-center gap-8 border-t border-zinc-900 max-w-md">
            <div>
              <p className="text-[9px] text-zinc-600 font-mono uppercase">Integrations</p>
              <p className="text-xs text-zinc-400 font-medium">GitHub Actions, Vercel, GitLab CI</p>
            </div>
            <div className="w-px h-6 bg-zinc-900" />
            <div>
              <p className="text-[9px] text-zinc-600 font-mono uppercase">Isolation Bound</p>
              <p className="text-xs text-zinc-400 font-medium">Docker Container Sandbox</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Interactive Command Center Loop */}
        <motion.div 
          className="lg:col-span-7 bg-[#09090A] border border-zinc-900 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[480px] relative font-mono text-xs text-zinc-300"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Mock Header Controls */}
          <div className="h-11 border-b border-zinc-900 bg-[#070708] px-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-zinc-550" />
              stellaops.io/command-center
            </span>
            <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded border border-white/5 text-[9px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>LIVE AGENT</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Sidebar Feed */}
            <div className="col-span-4 border-r border-zinc-900 bg-[#080809] p-3 flex flex-col gap-2">
              <span className="text-[9px] font-bold text-zinc-650 uppercase tracking-widest block mb-1">Repositories</span>
              
              <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 relative">
                <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-blue-500" />
                <div className="flex justify-between items-center text-[8px] text-zinc-500">
                  <span>checkout-service</span>
                  <span className="text-blue-400 font-bold">MONITORED</span>
                </div>
                <div className="text-[11px] font-medium text-white truncate mt-1">route.ts</div>
              </div>

              <div className="p-2.5 rounded-lg bg-black/10 border border-zinc-900/50 opacity-40">
                <div className="flex justify-between items-center text-[8px] text-zinc-550">
                  <span>auth-gateway</span>
                  <span>IDLE</span>
                </div>
                <div className="text-[11px] font-medium text-zinc-400 truncate mt-1">session.ts</div>
              </div>
            </div>

            {/* Main State Machine Viewer */}
            <div className="col-span-8 p-4 flex flex-col justify-between bg-[#050506]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-zinc-500 uppercase">Remediation Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-500 font-mono">Stage Progress:</span>
                    <div className="w-20 h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500" 
                        animate={{ width: `${heroProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* State Card */}
                <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-lg flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[9px] text-zinc-550 uppercase">Current Event Action</div>
                    <div className="text-xs text-white font-bold capitalize">
                      {heroState === 'idle' && 'Waiting for Failure webhook...'}
                      {heroState === 'detecting' && 'Ingesting CI Failure trace'}
                      {heroState === 'analyzing' && 'Locating Code Root Cause'}
                      {heroState === 'patching' && 'Compiling AST Code Patch'}
                      {heroState === 'verifying' && 'Running Sandboxed Vitests'}
                      {heroState === 'completed' && 'GitHub Pull Request Delivered'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-zinc-600 block uppercase">Confidence</span>
                    <span className={`text-xs font-bold font-mono ${heroState === 'completed' ? 'text-emerald-400' : 'text-blue-450'}`}>
                      {heroState === 'completed' ? '98%' : heroState === 'idle' ? '0%' : 'Calculating...'}
                    </span>
                  </div>
                </div>

                {/* Dynamic Terminal Logs */}
                <div className="h-44 bg-[#020203] border border-zinc-950 rounded-lg p-3 font-mono text-[10px] overflow-y-auto leading-relaxed custom-scrollbar flex flex-col gap-1.5 text-zinc-400">
                  <AnimatePresence mode="popLayout">
                    {heroState === 'idle' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} key="log-idle">
                        <span className="text-zinc-650">sys_daemon:</span> standing by for GitHub webhook triggers...
                      </motion.div>
                    )}

                    {heroState !== 'idle' && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key="log-1">
                        <span className="text-rose-400 font-bold">🔴 CI/CD BUILD FAILURE:</span> Job #9845210 exited status 1.
                      </motion.div>
                    )}

                    {(heroState === 'analyzing' || heroState === 'patching' || heroState === 'verifying' || heroState === 'completed') && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key="log-2">
                        <span className="text-blue-400 font-bold">🔍 ANALYSIS:</span> isolated route.ts:45 type mismatch.
                      </motion.div>
                    )}

                    {(heroState === 'patching' || heroState === 'verifying' || heroState === 'completed') && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key="log-3">
                        <span className="text-purple-400 font-bold">📝 AST PATCH:</span> applied optional chaining safely.
                      </motion.div>
                    )}

                    {(heroState === 'verifying' || heroState === 'completed') && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key="log-4">
                        <span className="text-emerald-400 font-bold">🧪 SANDBOX RUN:</span> vitest run checkout: 12/12 passed.
                      </motion.div>
                    )}

                    {heroState === 'completed' && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key="log-5">
                        <span className="text-amber-400 font-bold">🚀 AUTOMATION:</span> Pull Request #182 successfully opened.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-2 flex items-center justify-between text-[10px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${heroState === 'idle' ? 'bg-zinc-700' : 'bg-blue-500 animate-pulse'}`} />
                  <span className="uppercase text-[9px]">
                    {heroState === 'idle' ? 'STANDBY' : 'RUNNING PIPELINE'}
                  </span>
                </div>
                <span>checkout-service@main</span>
              </div>
            </div>
          </div>
        </motion.div>

      </section>

      {/* SECTION 2: THE INCIDENT JOURNEY */}
      <section id="workflow" className="border-y border-white/5 bg-zinc-950/40 py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-[10px] text-blue-500 uppercase tracking-widest font-mono font-bold mb-3">Narrative Flow</h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">From Failure to Pull Request</h3>
            <p className="text-zinc-400 text-sm leading-relaxed font-sans">
              CORI runs an automated verification loop. Observe how each stage computes, compiles, and delivers patches securely.
            </p>
          </div>

          {/* Timeline Horizontal Stepper */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10 relative">
            {JOURNEY_STEPS.map((step, idx) => {
              const isSelected = activeJourney === step.id
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveJourney(step.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                    isSelected 
                      ? 'bg-zinc-900 border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.08)]' 
                      : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-blue-400' : 'text-zinc-650'}`}>
                      0{idx + 1}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-zinc-550 bg-zinc-900 border border-white/5 px-1.5 py-0.2 rounded">
                      {step.tag}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate mb-1">
                    {step.label}
                  </h4>
                  <p className="text-[9px] text-zinc-500 font-mono">
                    {step.metric}
                  </p>
                  
                  {isSelected && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500"
                      layoutId="activeTimelineTab"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Stepper Content Panel below */}
          <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[320px]">
            {/* Info pane */}
            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between border-r border-white/5 text-left">
              <div className="space-y-4">
                <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                  {JOURNEY_STEPS.find(s => s.id === activeJourney)?.tag}
                </span>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider font-mono">
                  {JOURNEY_STEPS.find(s => s.id === activeJourney)?.label}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {JOURNEY_STEPS.find(s => s.id === activeJourney)?.description}
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-900 mt-6">
                <span className="text-[9px] font-mono text-zinc-550 uppercase block">Metric Checked</span>
                <span className="text-xs font-bold text-white font-mono">
                  {JOURNEY_STEPS.find(s => s.id === activeJourney)?.metric}
                </span>
              </div>
            </div>

            {/* Output pane */}
            <div className="lg:col-span-7 bg-black/40 flex flex-col">
              <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>Output Stream: {JOURNEY_STEPS.find(s => s.id === activeJourney)?.outputType}</span>
                <span>readonly</span>
              </div>
              <div className="flex-1 p-6 font-mono text-[10.5px] text-zinc-400 overflow-x-auto whitespace-pre leading-relaxed text-left">
                <pre>{JOURNEY_STEPS.find(s => s.id === activeJourney)?.output}</pre>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3: REAL INCIDENT WALKTHROUGH */}
      <section className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-[10px] text-blue-500 uppercase tracking-widest font-mono font-bold mb-3">Live Walkthrough</h2>
          <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">A Production Failure Investigated</h3>
          <p className="text-zinc-400 text-sm leading-relaxed font-sans">
            Watch CORI isolate a runtime syntax token blockage, compile the diff, and execute verification scripts in real-time.
          </p>
        </div>

        {/* Walkthrough Pipeline Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-8 text-left">
          
          {/* Column 1: Compiler Error */}
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-5 flex flex-col justify-between h-[300px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  Stage 1: The Error
                </span>
                <span className="text-zinc-500">app/page.tsx:265</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                TypeScript parser crashes due to a raw unescaped token character inside a branch list node.
              </p>
            </div>
            
            <div className="bg-black/60 border border-zinc-900 rounded-lg p-3.5 font-mono text-[10px] leading-relaxed text-zinc-500">
              <div className="text-red-400 bg-red-950/20 px-1 py-0.5 rounded mb-2">{"Syntax error: Unexpected token. Did you mean {'>'} or &gt;?"}</div>
              <div>264 | stellaops/patch-auth-session</div>
              <div className="text-red-400 bg-red-950/20">265 | stellaops/patch-auth-session-null -&gt; main</div>
              <div>266 |     &lt;/p&gt;</div>
            </div>
          </div>

          {/* Column 2: Analysis */}
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-5 flex flex-col justify-between h-[300px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Stage 2: Analysis
                </span>
                <span className="text-zinc-500">compiler_trace_ast</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Deterministic log analyzer scans AST tokens and flags JSX bounds mapping violation.
              </p>
            </div>

            <div className="bg-black/60 border border-zinc-900 rounded-lg p-3.5 font-mono text-[10px] space-y-1.5 text-zinc-450">
              <div>AST Node: <span className="text-zinc-300">JSXText</span></div>
              <div>Violation: <span className="text-red-400">Raw character '&gt;' found in text.</span></div>
              <div className="text-emerald-400 font-bold">Resolution: Replace with HTML entity reference '&amp;gt;'</div>
            </div>
          </div>

          {/* Column 3: Generated Patch */}
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-5 flex flex-col justify-between h-[300px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                  Stage 3: The Patch
                </span>
                <span className="text-zinc-500">unified.diff</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Generates a clean code correction diff targeting the exact error line.
              </p>
            </div>

            <div className="bg-black/60 border border-zinc-900 rounded-lg p-3.5 font-mono text-[9.5px] leading-relaxed text-zinc-500 overflow-x-auto">
              <div>@@ -263,4 +263,4 @@</div>
              <div className="bg-red-950/30 text-rose-400">- stellaops/patch-auth-session-null -&gt; main</div>
              <div className="bg-emerald-950/30 text-emerald-400">+ stellaops/patch-auth-session-null -&amp;gt; main</div>
            </div>
          </div>

        </div>

        {/* Walkthrough Controls / Progress Bar */}
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400 font-bold uppercase tracking-wider">WALKTHROUGH STREAM:</span>
            <span className="text-white">
              {walkthroughStep === 0 && 'Standing by...'}
              {walkthroughStep === 1 && 'Ingesting syntax failure...'}
              {walkthroughStep === 2 && 'Resolving compiler AST node...'}
              {walkthroughStep === 3 && 'Staging syntax diff patch...'}
              {walkthroughStep === 4 && 'Spawning isolated compilation sandbox...'}
              {walkthroughStep === 5 && 'Delivering GitHub PR #182 ✅'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Progress:</span>
            <div className="w-28 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500" 
                animate={{ width: `${(walkthroughStep / 5) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>

      </section>

      {/* SECTION 4: THE PLATFORM (BENTO GRID) */}
      <section className="border-t border-white/5 py-24 bg-[#080809]/50 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-[10px] text-blue-500 uppercase tracking-widest font-mono font-bold mb-3">Capabilities</h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">Everything Engineers Need In One Place</h3>
            <p className="text-zinc-400 text-sm leading-relaxed font-sans">
              No conversational widgets or generic chats. CORI provides a clean, automated engineering console.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch font-mono text-xs">
            
            {/* Card 1: Command Center (Col-span 8) */}
            <motion.div 
              className="md:col-span-8 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Control hub</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Command Center</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Configure pipelines, audit live remediation runs, and trace code coverage paths on a unified interface.
                </p>
              </div>
              <div className="bg-black/45 border border-zinc-900 rounded p-2.5 flex justify-between items-center text-[10px] text-zinc-500 mt-4">
                <span>Active Runners: 3</span>
                <span>Trace paths monitored: 1,410</span>
              </div>
            </motion.div>

            {/* Card 2: Repository Monitoring (Col-span 4) */}
            <motion.div 
              className="md:col-span-4 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Sync System</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Repository Monitoring</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                   granular branch and commit checks on selected repositories.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4 text-[10px] text-zinc-400 font-mono">
                <Database className="w-4 h-4 text-blue-500" />
                <span>stellaops/payment-handler [Healthy]</span>
              </div>
            </motion.div>

            {/* Card 3: Incident Queue (Col-span 4) */}
            <motion.div 
              className="md:col-span-4 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Event Streams</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Incident Queue</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Real-time feed tracking all active compilation and syntax warnings.
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded px-2.5 py-1 text-[10px] text-rose-400 font-mono mt-4">
                🔴 INC-1842: Compilation mismatch check
              </div>
            </motion.div>

            {/* Card 4: Verification Engine (Col-span 8) */}
            <motion.div 
              className="md:col-span-8 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Runner Engine</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Verification Sandbox</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Mounts ephemeral, network-isolated Docker containers to compile code and run tests before PR opening.
                </p>
              </div>
              <div className="bg-[#020203] border border-zinc-900 rounded p-2.5 text-[9.5px] text-zinc-550 mt-4 leading-normal font-mono">
                $ docker run --network=none -v /tmp/build:/app cori-sandbox
              </div>
            </motion.div>

            {/* Card 5: PR Automation (Col-span 3) */}
            <motion.div 
              className="md:col-span-3 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Git Hooks</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Pull Requests</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Automated commits and PR creation via verified bots.
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-4">
                <GitPullRequest className="w-4 h-4 text-blue-500" />
                <span>PR #182 verified checks</span>
              </div>
            </motion.div>

            {/* Card 6: Audit Trail (Col-span 3) */}
            <motion.div 
              className="md:col-span-3 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Compliance</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Audit Trail</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Comprehensive audit trail logs of sandbox outputs and evaluations.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-4">
                <History className="w-4 h-4 text-zinc-600" />
                <span>Audited: Node:18 env</span>
              </div>
            </motion.div>

            {/* Card 7: Confidence Scoring (Col-span 3) */}
            <motion.div 
              className="md:col-span-3 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Metrics</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Confidence Score</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Ensures minimal changes with syntactic AST matching metrics.
                </p>
              </div>
              <div className="text-blue-400 font-bold text-sm mt-4">
                98% Safety Score
              </div>
            </motion.div>

            {/* Card 8: Webhook Processing (Col-span 3) */}
            <motion.div 
              className="md:col-span-3 bg-zinc-950 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between group min-h-[180px] text-left cursor-pointer"
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold font-mono">Ingestion</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Webhooks</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  High-speed parsing pipelines taking triggers below 120ms.
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-450 mt-4">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Webhooks ACTIVE</span>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 5: WHY TEAMS TRUST CORI (PIPELINE) */}
      <section id="verification" className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-[10px] text-blue-500 uppercase tracking-widest font-mono font-bold mb-3">Containment Pipeline</h2>
          <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">Verification Before Automation</h3>
          <p className="text-zinc-400 text-sm leading-relaxed font-sans">
            Many AI coding assistants stop after generating code. CORI applies safety containment loops, compiling the code and running tests inside network-disabled sandboxes.
          </p>
        </div>

        {/* Pipeline Steps Row */}
        <div className="grid grid-cols-2 md:grid-cols-8 gap-3 font-mono text-[10px] text-zinc-400 items-stretch text-left">
          
          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 0 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">01</span>
            <div>
              <h5 className="font-bold text-white uppercase">Generate Patch</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Calculates code modifications.</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 1 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">02</span>
            <div>
              <h5 className="font-bold text-white uppercase">Create Sandbox</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Spawns Docker container.</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 2 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">03</span>
            <div>
              <h5 className="font-bold text-white uppercase">Install Deps</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Restores dependencies cache.</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 3 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">04</span>
            <div>
              <h5 className="font-bold text-white uppercase">Run Build</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Compiles static build assets.</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 4 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">05</span>
            <div>
              <h5 className="font-bold text-white uppercase">Run Tests</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Executes checking test suites.</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 5 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">06</span>
            <div>
              <h5 className="font-bold text-white uppercase">Confidence</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Evaluates check properties.</p>
            </div>
          </div>

              <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 6 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-600 block">07</span>
            <div>
              <h5 className="font-bold text-white uppercase">Approve</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Manual or automated sign-off.</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all duration-300 ${activeTrustStep === 7 ? 'bg-zinc-900 border-white/20' : 'bg-zinc-950/60 border-zinc-900'}`}>
            <span className="text-zinc-650 block">08</span>
            <div>
              <h5 className="font-bold text-white uppercase text-blue-400">Open PR</h5>
              <p className="text-[9px] text-zinc-550 leading-tight mt-0.5 font-sans">Pushes code branch changes.</p>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: PRODUCT SHOWCASE ("Inside CORI") */}
      <section id="showcase" className="border-t border-white/5 py-24 bg-zinc-950/30 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-[10px] text-blue-500 uppercase tracking-widest font-mono font-bold mb-3 font-mono">Inside CORI</h2>
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">Inside CORI</h3>
            <p className="text-zinc-400 text-sm leading-relaxed font-sans">
              Explore the actual interfaces engineers use to investigate incidents, review verification results, and manage remediation workflows.
            </p>
          </div>

          {/* Tabs Control */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 border-b border-white/5 pb-4 font-mono text-xs">
            {[
              { id: 'command', name: 'Command Center' },
              { id: 'repos', name: 'Repositories' },
              { id: 'incidents', name: 'Incidents' },
              { id: 'sandbox', name: 'Verification' },
              { id: 'prs', name: 'Pull Requests' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveShowcase(tab.id as any)}
                className={`px-4 py-2 rounded-lg border transition-all uppercase tracking-wider text-[10px] cursor-pointer ${
                  activeShowcase === tab.id
                    ? 'bg-white text-zinc-950 border-white font-bold'
                    : 'text-zinc-400 border-white/5 bg-zinc-900/40 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Screenshot Container Frame */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="w-full max-w-[1400px] mx-auto mt-8"
          >
            <div className="w-full bg-[#080809]/60 backdrop-blur-md border border-white/5 rounded-[24px] shadow-[0_0_50px_rgba(59,130,246,0.12)] hover:shadow-[0_0_60px_rgba(59,130,246,0.22)] hover:bg-[#0c0c0e]/80 transition-all duration-300 overflow-hidden relative p-6 flex flex-col items-center group">
              {/* macOS-style window header */}
              <div className="w-full flex items-center justify-between pb-6 border-b border-white/5 mb-6">
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                  <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-sm tracking-wide font-mono">
                    {activeShowcase === 'command' && 'Command Center'}
                    {activeShowcase === 'repos' && 'Repositories'}
                    {activeShowcase === 'incidents' && 'Incidents'}
                    {activeShowcase === 'sandbox' && 'Verification'}
                    {activeShowcase === 'prs' && 'Pull Requests'}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-mono">
                    Real Product Interface
                  </span>
                </div>
                <div className="w-12" /> {/* spacer to balance macOS buttons */}
              </div>

              {/* Screenshot View Area with Framer Motion Crossfade */}
              <div className="w-full flex justify-center items-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeShowcase}
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.99 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="w-full flex justify-center"
                  >
                    <img 
                      src={
                        activeShowcase === 'command' ? '/command.png' :
                        activeShowcase === 'repos' ? '/repo.png' :
                        activeShowcase === 'incidents' ? '/incident.png' :
                        activeShowcase === 'sandbox' ? '/verification.png' :
                        '/pr.png'
                      } 
                      alt={`${activeShowcase} screenshot`}
                      className="w-full max-h-[700px] object-contain rounded-lg border border-white/5 shadow-2xl transition-transform duration-300 group-hover:scale-[1.002]"
                      style={{ imageRendering: 'auto' }}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* SECTION 7: FAQ */}
      <section id="faq" className="border-t border-white/5 py-24 bg-[#050505] relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <h2 className="text-[10px] text-blue-500 uppercase tracking-widest font-mono font-bold mb-3 font-mono">Technical FAQ</h2>
            <h3 className="text-3xl font-bold tracking-tight text-white mb-4">Engineering Specifications</h3>
            <p className="text-zinc-400 text-sm leading-relaxed font-sans">
              Direct, code-focused specifications explaining security boundaries and AST processing logic.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_SPEC.map((faq, idx) => (
              <motion.div 
                key={idx} 
                className="p-5 bg-zinc-950 border border-white/5 rounded-xl text-left space-y-2"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
              >
                <h4 className="text-sm font-bold text-white font-mono flex items-start gap-3">
                  <span className="text-blue-500 font-bold shrink-0 mt-0.5">Q:</span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed pl-7 font-sans">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section className="border-t border-white/5 py-32 bg-zinc-950 text-center relative overflow-hidden z-10">
        
        {/* Animated grid overlay */}
        <div className="absolute inset-0 bg-grid-lines pointer-events-none opacity-20" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto px-6 relative z-20 space-y-8">
          <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white uppercase font-mono">
            Stop Investigating Build Failures Manually
          </h3>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed font-sans">
            Let CORI analyze incidents, verify fixes, and prepare pull requests while your team ships product.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <motion.button 
                className="w-full sm:w-auto bg-white hover:bg-zinc-250 text-zinc-950 font-bold px-8 py-3 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Deploy CORI
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#050505] py-12 text-xs text-zinc-500 font-mono relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Command className="w-3 h-3 text-blue-500" />
            </div>
            <span className="font-bold tracking-tight text-zinc-300 font-mono text-xs">CORI Platform</span>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-zinc-450 font-sans text-[11px]">
            <a href="#workflow" className="hover:text-white transition-colors">How it works</a>
            <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
            <a href="#verification" className="hover:text-white transition-colors">Safety</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-white transition-colors">Dashboard</Link>
          </div>

          <div className="flex items-center gap-4 text-zinc-550 text-[11px]">
            <span>© {new Date().getFullYear()} CORI Inc.</span>
            <span>•</span>
            <a href="#" className="hover:text-zinc-350 flex items-center gap-1">
              <span>Security</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-650" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
