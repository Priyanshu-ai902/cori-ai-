import { SidebarNav } from '@/components/sidebar-nav'
import { TopNav } from '@/components/top-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#050505] min-h-screen flex text-foreground selection:bg-blue-500/30">
      <SidebarNav />
      
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen relative z-10">
        <main className="flex-1 p-0 overflow-hidden h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
