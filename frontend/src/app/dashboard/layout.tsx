import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { BottomNav } from "@/components/navigation/BottomNav";
import CommandPalette from "@/components/navigation/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <CommandPalette />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <DashboardHeader />
        
        <div className="custom-scrollbar flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(0,212,170,0.08),transparent_26%),linear-gradient(180deg,rgba(7,10,15,0.82),rgba(6,9,14,0.98))] px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pb-10">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
