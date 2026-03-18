'use client';

import { Menu, Bell, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-foreground hover:text-primary hover:bg-input rounded-lg p-2 transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black text-foreground">PredMaint</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            className="pl-10 w-48 bg-input border-border rounded-lg focus:border-primary/50"
          />
        </div>

        <button className="relative p-2 hover:bg-input rounded-lg transition-all duration-200 hover:text-primary group">
          <Bell className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse shadow-lg shadow-destructive/50" />
        </button>

        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/40 hover:shadow-lg hover:shadow-primary/60 transition-all cursor-pointer">
          <span className="text-white font-black text-sm">AI</span>
        </div>
      </div>
    </header>
  );
}
