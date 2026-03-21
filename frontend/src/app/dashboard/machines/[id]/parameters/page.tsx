"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Plus, Trash2, Zap, Sparkles, 
  Save, Plug, X, Info, Settings2, ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ParameterManagerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idStr = resolvedParams.id;

  const [parameters, setParameters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [idStr]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [params, temps] = await Promise.all([
        api.getMachineParameters(idStr),
        api.getTemplates()
      ]);
      setParameters(params);
      setTemplates(temps);
    } catch (error) {
      console.error("Failed to fetch parameters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParam = () => {
    setEditingParam({
      parameter_key: "",
      display_name: "",
      unit: "",
      normal_min: 0,
      normal_max: 100,
      warning_threshold: 110,
      critical_threshold: 120,
      direction: "above",
      description: "",
      category: "custom"
    });
    setIsEditorOpen(true);
  };

  const handleEditParam = (param: any) => {
    setEditingParam({ ...param });
    setIsEditorOpen(true);
  };

  const handleSaveParam = async () => {
    setIsSaving(true);
    try {
      await api.addMachineParameter(idStr, editingParam);
      await fetchData();
      setIsEditorOpen(false);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save parameter.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    setIsLoading(true);
    try {
      await api.applyTemplate(idStr, templateName);
      await fetchData();
      setIsTemplatesOpen(false);
    } catch (error) {
      console.error("Template application failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-12 text-center font-mono text-[var(--color-muted)]">Loading Parameter Registry...</div>;

  const commonParams = parameters.filter(p => p.category === 'common');
  const customParams = parameters.filter(p => p.category !== 'common');

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-muted)]">
        <Link href={`/dashboard/machines/${idStr}`} className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Back to Machine Detail
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-[var(--color-primary)]" /> Parameter Registry
          </h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">Define thresholds and units for machine-specific telemetry.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsTemplatesOpen(true)}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-border)]/50 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-[var(--color-warning)]" /> Import Template
          </button>
          <button 
            onClick={handleAddParam}
            className="bg-[var(--color-primary)] text-[#0D1117] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#00e6b8] transition-colors flex items-center gap-2 shadow-[0_0_10px_var(--color-primary)]/30"
          >
            <Plus className="w-4 h-4" /> Add Parameter
          </button>
        </div>
      </div>

      {/* Common Parameters */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
          <Info className="w-3 h-3" /> Universal Baseline Parameters
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {commonParams.map(param => (
            <ParameterRow key={param.id} param={param} onEdit={() => handleEditParam(param)} />
          ))}
        </div>
      </section>

      {/* Machine-Specific Parameters */}
      <section className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
          <Settings2 className="w-3 h-3" /> Machine-Specific Parameters
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {customParams.length > 0 ? (
            customParams.map(param => (
              <ParameterRow key={param.id} param={param} onEdit={() => handleEditParam(param)} />
            ))
          ) : (
            <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/30">
              <p className="text-sm text-[var(--color-muted)]">No machine-specific parameters defined.</p>
              <button 
                onClick={handleAddParam}
                className="mt-3 text-[var(--color-primary)] text-xs font-bold hover:underline"
              >
                + Create your first custom parameter
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Parameter Editor Slide-in */}
      {isEditorOpen && editingParam && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditorOpen(false)} />
          <div className="relative w-full max-w-xl bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]">
              <h3 className="text-xl font-bold">{editingParam.id ? 'Edit' : 'Add'} Parameter</h3>
              <button onClick={() => setIsEditorOpen(false)}><X className="w-6 h-6 text-[var(--color-muted)] hover:text-white" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Display Name</label>
                  <input 
                    type="text" 
                    value={editingParam.display_name}
                    onChange={e => setEditingParam({...editingParam, display_name: e.target.value, parameter_key: e.target.value.toLowerCase().replace(/ /g, '_')})}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3 text-sm focus:border-[var(--color-primary)] outline-none"
                    placeholder="e.g. Spindle Temperature"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Slug Key</label>
                  <input 
                    type="text" 
                    value={editingParam.parameter_key}
                    readOnly={!!editingParam.id}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-sm font-mono opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Unit</label>
                  <input 
                    type="text" 
                    value={editingParam.unit}
                    onChange={e => setEditingParam({...editingParam, unit: e.target.value})}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3 text-sm focus:border-[var(--color-primary)] outline-none"
                    placeholder="°C, mm/s, bar, %"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Alert Direction</label>
                  <select 
                    value={editingParam.direction}
                    onChange={e => setEditingParam({...editingParam, direction: e.target.value})}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3 text-sm focus:border-[var(--color-primary)] outline-none"
                  >
                    <option value="above">Bad if Above</option>
                    <option value="below">Bad if Below</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-background)] rounded-xl border border-[var(--color-border)]">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Normal Min</label>
                  <input type="number" value={editingParam.normal_min} onChange={e => setEditingParam({...editingParam, normal_min: parseFloat(e.target.value)})} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Normal Max</label>
                  <input type="number" value={editingParam.normal_max} onChange={e => setEditingParam({...editingParam, normal_max: parseFloat(e.target.value)})} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-warning)]">Warning Threshold</label>
                  <input type="number" value={editingParam.warning_threshold} onChange={e => setEditingParam({...editingParam, warning_threshold: parseFloat(e.target.value)})} className="w-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-2 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-destructive)]">Critical Threshold</label>
                  <input type="number" value={editingParam.critical_threshold} onChange={e => setEditingParam({...editingParam, critical_threshold: parseFloat(e.target.value)})} className="w-full bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 rounded-lg p-2 text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Parameter Description (for AI Agent)</label>
                <textarea 
                  value={editingParam.description || ""}
                  onChange={e => setEditingParam({...editingParam, description: e.target.value})}
                  rows={3}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3 text-sm focus:border-[var(--color-primary)] outline-none"
                  placeholder="Explain what this parameter measures and why it is important for maintenance analysis..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-background)] flex gap-3">
              <button 
                onClick={handleSaveParam}
                disabled={isSaving}
                className="flex-1 bg-[var(--color-primary)] text-[#0D1117] font-bold py-3 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Parameter</>}
              </button>
              <button 
                onClick={() => setIsEditorOpen(false)}
                className="px-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-[var(--color-border)]/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTemplatesOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--color-warning)]" /> Import Machine Template
              </h3>
              <button onClick={() => setIsTemplatesOpen(false)}><X className="w-6 h-6 text-[var(--color-muted)]" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(templates).map(name => (
                <button 
                  key={name}
                  onClick={() => handleApplyTemplate(name)}
                  className="p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-left hover:border-[var(--color-primary)]/50 transition-all group"
                >
                  <h4 className="font-bold mb-1 group-hover:text-[var(--color-primary)] transition-colors">{name}</h4>
                  <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-widest">{templates[name].length} Custom Parameters</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Apply Template <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ParameterRow({ param, onEdit }: { param: any, onEdit: () => void }) {
  return (
    <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-[var(--color-border)] hover:border-l-[var(--color-primary)] transition-all group">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold group-hover:text-[var(--color-primary)] transition-colors">{param.display_name}</span>
          <span className="text-[10px] font-mono text-[var(--color-muted)]">{param.parameter_key}</span>
        </div>
        <div className="h-8 w-px bg-[var(--color-border)] mx-2 hidden sm:block" />
        <div className="hidden sm:flex flex-col">
          <span className="text-[9px] uppercase font-bold text-[var(--color-muted)] tracking-widest">Normal Range</span>
          <span className="text-xs font-mono">{param.normal_min} – {param.normal_max} {param.unit}</span>
        </div>
        <div className="h-8 w-px bg-[var(--color-border)] mx-2 hidden md:block" />
        <div className="hidden md:flex flex-col">
          <span className="text-[9px] uppercase font-bold text-[var(--color-warning)] tracking-widest">Warning</span>
          <span className="text-xs font-mono text-[var(--color-warning)]">{param.direction === 'above' ? '>' : '<'} {param.warning_threshold}</span>
        </div>
        <div className="h-8 w-px bg-[var(--color-border)] mx-2 hidden md:block" />
        <div className="hidden md:flex flex-col">
          <span className="text-[9px] uppercase font-bold text-[var(--color-destructive)] tracking-widest">Critical</span>
          <span className="text-xs font-mono text-[var(--color-destructive)]">{param.direction === 'above' ? '>' : '<'} {param.critical_threshold}</span>
        </div>
      </div>
      <button 
        onClick={onEdit}
        className="p-2 text-[var(--color-muted)] hover:text-white transition-colors"
      >
        <Settings2 className="w-5 h-5" />
      </button>
    </div>
  );
}
