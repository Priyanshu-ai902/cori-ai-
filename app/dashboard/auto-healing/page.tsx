'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Zap, Activity, ShieldCheck, Settings2, ShieldAlert } from 'lucide-react'

const autonomousActions = [
  {
    id: 1,
    time: '12 mins ago',
    title: 'Node version mismatch fixed',
    target: 'worker-service:main',
    type: 'configuration',
    impact: 'Prevented build failure',
    details: 'Detected mismatch between package.json engines (v20) and CI config (v18). Auto-updated CI config to v20.',
  },
  {
    id: 2,
    time: '3 hours ago',
    title: 'Docker cache issue resolved',
    target: 'api-service:main',
    type: 'performance',
    impact: 'Saved ~2m per build',
    details: 'Layer cache became corrupted. CORI automatically purged the runner cache and triggered a clean build.',
  },
  {
    id: 3,
    time: '5 hours ago',
    title: 'Workflow timeout recovered',
    target: 'e2e-tests:nightly',
    type: 'recovery',
    impact: 'Saved manual rerun (15m)',
    details: 'Cypress tests hung on flaky third-party stub. CORI aborted and injected a retry block specific to that suite.',
  },
  {
    id: 4,
    time: 'Yesterday',
    title: 'Terraform lock conflict healed',
    target: 'infrastructure:prod',
    type: 'state',
    impact: 'Unblocked production deployment',
    details: 'Stale terraform state lock detected from an aborted run. CORI safely force-unlocked after verifying no active agents.',
  },
]

export default function AutoHealingPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Autonomous Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">CORI detects and resolves common issues without manual intervention.</p>
        </div>
        <Badge className="bg-green-500/10 text-green-500 border-green-500/30 gap-1.5 px-3 py-1">
          <ShieldCheck className="w-4 h-4" />
          Auto-Healing Active
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-foreground">99.2%</p>
            <p className="text-xs text-green-500 font-medium">+0.4%</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">128/129 autonomous actions succeeded</p>
        </Card>
        <Card className="p-5 border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Saved (30d)</p>
          <p className="text-3xl font-bold text-blue-500 mt-2">102h</p>
          <p className="text-xs text-muted-foreground mt-1">Time avoided on manual troubleshooting</p>
        </Card>
        <Card className="p-5 border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Failures Prevented</p>
          <p className="text-3xl font-bold text-foreground mt-2">47</p>
          <p className="text-xs text-muted-foreground mt-1">Silent recoveries in the background</p>
        </Card>
      </div>

      {/* Execution Timeline */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Autonomous Actions</h3>
          <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
            <Settings2 className="w-3 h-3" />
            Configure Healing Rules
          </button>
        </div>
        
        <div className="p-6">
          <div className="relative border-l border-border ml-3 space-y-8">
            {autonomousActions.map((action, i) => (
              <div key={action.id} className="relative pl-6">
                <div className="absolute -left-2.5 top-1 w-5 h-5 rounded-full bg-card border border-blue-500/50 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-semibold text-foreground">{action.title}</h4>
                      <Badge variant="outline" className="text-[10px] font-mono bg-secondary/50">
                        {action.target}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{action.details}</p>
                    <div className="flex items-center gap-2 mt-2 pt-2">
                      <ShieldAlert className="w-3 h-3 text-green-500" />
                      <span className="text-xs font-medium text-green-500">{action.impact}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">{action.time}</span>
                    <Badge variant="secondary" className="mt-2 text-[10px] uppercase">
                      {action.type}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
