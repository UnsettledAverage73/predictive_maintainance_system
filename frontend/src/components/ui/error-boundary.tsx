"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="glass-panel p-6 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm uppercase tracking-widest text-red-500">
                {this.props.title || "Interface Error"}
              </h3>
              <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">
                The neural link to this component has been severed. This can happen during high-frequency telemetry synchronization.
              </p>
            </div>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-lg"
            >
              <RefreshCw className="w-3 h-3" /> Re-establish Link
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
