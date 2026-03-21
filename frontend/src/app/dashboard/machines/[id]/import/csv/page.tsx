"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Upload, FileText, CheckCircle2, 
  AlertTriangle, ArrowRight, Loader2, Table
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function CSVImportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idStr = resolvedParams.id;

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [timestampCol, setTimestampCol] = useState("");
  const [parameters, setParameters] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMachineParameters(idStr).then(setParameters);
  }, [idStr]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.previewCsv(idStr, formData);
      setPreviewData(res);
      setMappings(res.suggested_mappings);
      setTimestampCol(res.timestamp_column);
      setStep(2);
    } catch (error) {
      console.error("Preview failed:", error);
      alert("Failed to read CSV. Ensure it is a valid format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mappings", JSON.stringify(mappings));
      formData.append("timestamp_column", timestampCol);
      
      const res = await api.confirmCsv(idStr, formData);
      setImportResult(res);
      setStep(3);
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMapping = (csv_col: string, param_key: string) => {
    setMappings(prev => prev.map(m => 
      m.csv_col === csv_col ? { ...m, parameter_key: param_key === "skip" ? null : param_key } : m
    ));
  };

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
            <Upload className="w-6 h-6 text-[var(--color-primary)]" /> CSV Data Ingestion
          </h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">LLM-powered column mapping for flexible telemetry imports.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 py-4">
        {[
          { n: 1, label: "Upload File" },
          { n: 2, label: "Map Columns" },
          { n: 3, label: "Complete" }
        ].map(s => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
              step === s.n ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-black" : 
              step > s.n ? "bg-[var(--color-success)] border-[var(--color-success)] text-white" : 
              "border-[var(--color-border)] text-[var(--color-muted)]"
            )}>
              {step > s.n ? "✓" : s.n}
            </div>
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider",
              step >= s.n ? "text-white" : "text-[var(--color-muted)]"
            )}>{s.label}</span>
            {s.n < 3 && <div className="w-8 h-px bg-[var(--color-border)] mx-2" />}
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-8 min-h-[400px]">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg border-2 border-dashed border-[var(--color-border)] rounded-2xl p-12 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer group"
            >
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-[var(--color-muted)] group-hover:text-[var(--color-primary)]" />
              </div>
              <h3 className="text-lg font-bold mb-2">{file ? file.name : "Select machine telemetry CSV"}</h3>
              <p className="text-sm text-[var(--color-muted)] max-w-sm mx-auto">
                Drag and drop your file here, or click to browse. We support standard CSV formats with headers.
              </p>
            </div>
            {file && (
              <button 
                onClick={handleUpload}
                disabled={isProcessing}
                className="mt-8 bg-[var(--color-primary)] text-black font-bold px-8 py-3 rounded-xl hover:brightness-110 transition-all flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Analyze Columns</>}
              </button>
            )}
          </div>
        )}

        {step === 2 && previewData && (
          <div className="animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Column Mapping</h3>
                <p className="text-sm text-[var(--color-muted)]">Confirm or adjust the AI-suggested mappings below.</p>
              </div>
              <button 
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="bg-[var(--color-success)] text-white font-bold px-6 py-2.5 rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Start Ingestion</>}
              </button>
            </div>

            <div className="bg-[var(--color-background)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0D1117] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-[var(--color-muted)]">CSV Column</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-[var(--color-muted)]">Sample Values</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-[var(--color-muted)]">Maps to Parameter</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-[var(--color-muted)]">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {mappings.map((m, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface)]/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[var(--color-primary)]">{m.csv_col}</td>
                      <td className="px-6 py-4 text-[var(--color-muted)] text-xs">
                        {previewData.sample_rows.slice(0, 2).map((r: any) => r[previewData.headers.indexOf(m.csv_col)]).join(", ")}...
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={m.parameter_key || "skip"}
                          onChange={(e) => updateMapping(m.csv_col, e.target.value)}
                          className="bg-[var(--color-background)] border border-[var(--color-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
                        >
                          <option value="skip">Skip this column</option>
                          {parameters.map(p => (
                            <option key={p.parameterKey} value={p.parameterKey}>{p.displayName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          m.confidence > 0.8 ? "bg-teal-500/10 text-teal-500" : 
                          m.confidence > 0.4 ? "bg-amber-500/10 text-amber-500" : 
                          "bg-red-500/10 text-red-500"
                        )}>
                          {(m.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Timestamp Column</label>
                <select 
                  value={timestampCol}
                  onChange={(e) => setTimestampCol(e.target.value)}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                >
                  {previewData.headers.map((h: string) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 text-xs text-[var(--color-muted)] leading-relaxed">
                <InfoIcon className="inline w-3 h-3 mr-1" />
                Select which column contains the date/time information. All readings will be timestamped relative to this column.
              </div>
            </div>
          </div>
        )}

        {step === 3 && importResult && (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[var(--color-success)]/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-[var(--color-success)]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Ingestion Complete</h3>
            <p className="text-[var(--color-muted)] max-w-sm mx-auto mb-8">
              Successfully imported <span className="text-white font-bold">{importResult.rows_imported} rows</span> of telemetry data into the machine ledger.
            </p>
            <div className="flex gap-4">
              <Link 
                href={`/dashboard/machines/${idStr}`}
                className="bg-[var(--color-primary)] text-black font-bold px-8 py-3 rounded-xl hover:brightness-110 transition-all flex items-center gap-2"
              >
                View Machine Detail <ArrowRight className="w-4 h-4" />
              </Link>
              <button 
                onClick={() => setStep(1)}
                className="px-8 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-white font-medium rounded-xl hover:bg-[var(--color-border)]/50 transition-all"
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
