'use client'

import { Bell, Search, LogOut, User, Command, ChevronDown } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

export function TopNav() {
  return (
    <header className="fixed top-0 left-64 right-0 z-30 bg-[#0a0a0a]/50 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-8">
      {/* Header content removed as per CORI requirements */}
    </header>
  )
}

