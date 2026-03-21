import { Settings2 } from "lucide-react";

export function MachineCardSkeleton() {
  return (
    <div className="glass-panel p-5 rounded-xl border-l-[3px] border-l-slate-700 animate-pulse w-full">
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/2 h-5 bg-slate-700/50 rounded" />
        <div className="w-1/4 h-3 bg-slate-700/30 rounded" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="space-y-2">
          <div className="w-1/3 h-2 bg-slate-700/30 rounded" />
          <div className="w-1/2 h-6 bg-slate-700/50 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-1/3 h-2 bg-slate-700/30 rounded" />
          <div className="w-1/2 h-6 bg-slate-700/50 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-1/3 h-2 bg-slate-700/30 rounded" />
          <div className="w-1/2 h-4 bg-slate-700/50 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-1/3 h-2 bg-slate-700/30 rounded" />
          <div className="w-1/2 h-4 bg-slate-700/50 rounded" />
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-700/30 flex justify-between items-center">
        <div className="w-20 h-6 bg-slate-700/50 rounded" />
        <div className="w-8 h-8 rounded-full bg-slate-700/30 flex items-center justify-center">
          <Settings2 className="w-4 h-4 text-slate-500" />
        </div>
      </div>
    </div>
  );
}
