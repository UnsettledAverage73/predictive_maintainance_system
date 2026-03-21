import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[var(--color-background)] overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            animation: 'pan-bg 20s linear infinite',
          }}
        />
        <style>{`
          @keyframes pan-bg {
            from { background-position: 0 0; }
            to { background-position: -40px -40px; }
          }
        `}</style>
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-info)]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}
