'use client';
import { useState } from 'react';
import { RBACGate } from '@/components/auth/rbac-gate';
import { SecurityBadge } from '@/components/security/SecurityBadge';
import { APIKeyReveal } from '@/components/security/APIKeyReveal';
import { SessionCard, Session } from '@/components/security/SessionCard';
import { ConfirmPhraseModal } from '@/components/ui/confirm-phrase-modal';

const MOCK_SESSIONS: Session[] = [
  { id: '1', device: 'Chrome on Windows', ip: '192.168.1.45', location: 'Manchester, UK', lastActive: '2 minutes ago', started: 'Today 09:14', isCurrent: true },
  { id: '2', device: 'Safari on iPhone 14', ip: '82.122.45.12', location: 'London, UK', lastActive: '2 days ago', started: '18 Mar 08:30' },
  { id: '3', device: 'Edge on Windows', ip: '10.0.0.5', location: 'Birmingham, UK', lastActive: '1 week ago', started: '10 Mar 14:00' },
];

const MOCK_KEYS = [
  { id: 'k1', name: 'Factory Floor Display', created: '2026-01-15', lastUsed: '2 mins ago', expires: '2027-01-15', scope: 'Read-only' },
  { id: 'k2', name: 'ERP Integration', created: '2026-03-01', lastUsed: '1 hour ago', expires: '2026-06-01', scope: 'Read-write' },
];

const MOCK_AUDIT = [
  { id: 'a1', time: '10:45:00', user: 'j.smith (Engineer)', type: 'Login Success', details: 'Password Auth', ip: '192.168.1.45', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { id: 'a2', time: '09:15:22', user: 'system', type: 'Session Revoked', details: 'Idle timeout (14m)', ip: '10.0.0.5', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'a3', time: '08:00:10', user: 'admin', type: 'API Key Created', details: 'ERP Integration', ip: '82.122.45.12', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
];

export default function SecurityCentrePage() {
  const [activeTab, setActiveTab] = useState('auth');
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; phrase: string; action: string; onConfirm: () => void } | null>(null);

  const tabs = [
    { id: 'auth', label: 'Authentication', roles: ['Admin'] },
    { id: 'sessions', label: 'Sessions', roles: ['Admin', 'Engineer'] },
    { id: 'keys', label: 'API Keys', roles: ['Admin', 'Engineer'] },
    { id: 'audit', label: 'Audit Log', roles: ['Admin'] },
  ];

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const handleRevokeKey = (id: string) => {
    setKeys(keys.filter(k => k.id !== id));
  };

  const generateKey = () => {
    const key = `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setNewKey(key);
    setKeys([{ id: Date.now().toString(), name: 'New API Key', created: new Date().toISOString().split('T')[0], lastUsed: 'Never', expires: '90 days', scope: 'Read-only' }, ...keys]);
  };

  const openRevokeAllConfirm = () => {
    setConfirmModal({
      isOpen: true,
      phrase: 'revoke all',
      action: 'Revoke All Sessions',
      onConfirm: () => {
        setSessions(sessions.filter(s => s.isCurrent));
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security Centre</h1>
        <p className="text-[var(--color-muted)]">Manage authentication, active sessions, and API keys.</p>
      </div>

      <div className="flex space-x-1 border-b border-[var(--color-border)] overflow-x-auto pb-1 mb-6">
        {tabs.map(tab => (
          <RBACGate key={tab.id} allowedRoles={tab.roles}>
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] rounded-t'
              }`}
            >
              {tab.label}
            </button>
          </RBACGate>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'auth' && (
          <RBACGate allowedRoles={['Admin']}>
            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Multi-Factor Authentication (MFA)</h3>
                    <p className="text-sm text-[var(--color-muted)]">Require physical token or authenticator app for login.</p>
                  </div>
                  <SecurityBadge status="secure" />
                </div>
                <div className="flex space-x-4 border-t border-[var(--color-border)] pt-4">
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-black font-semibold rounded hover:brightness-110 transition-all">Enable MFA</button>
                  <button className="px-4 py-2 bg-slate-800 text-[var(--color-foreground)] border border-slate-700 rounded hover:bg-slate-700 transition-colors">Download Backup Codes</button>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold mb-2">Password Policy</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm text-[var(--color-muted)] mb-1">Minimum Length (12)</label>
                    <input type="range" min="8" max="32" defaultValue="12" className="w-full accent-[var(--color-primary)]" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-[var(--color-card)] border border-[var(--color-border)]">
                    <span className="text-sm">Require Special Characters</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-primary)]" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded bg-[var(--color-card)] border border-[var(--color-border)]">
                    <span className="text-sm">Breach Detection (HaveIBeenPwned)</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-primary)]" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="text-lg font-semibold mb-2">Session Policy</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm text-[var(--color-muted)] mb-1">Access Token Lifetime (15 mins)</label>
                    <input type="range" min="5" max="60" defaultValue="15" className="w-full accent-[var(--color-primary)]" />
                  </div>
                </div>
              </div>
            </div>
          </RBACGate>
        )}

        {activeTab === 'sessions' && (
          <RBACGate allowedRoles={['Admin', 'Engineer']}>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Active Sessions</h2>
                  <p className="text-sm text-[var(--color-muted)]">Manage your logged-in devices across the platform.</p>
                </div>
                <button 
                  onClick={openRevokeAllConfirm}
                  className="px-4 py-2 bg-red-900/30 text-[var(--color-destructive)] border border-red-900/50 rounded hover:bg-red-900/50 transition-colors text-sm"
                >
                  Revoke All Other Sessions
                </button>
              </div>
              
              <div className="grid gap-3">
                {sessions.map(s => (
                  <SessionCard key={s.id} session={s} onRevoke={handleRevokeSession} />
                ))}
                {sessions.length === 0 && (
                  <div className="p-8 text-center text-[var(--color-muted)] border border-[var(--color-border)] rounded-lg border-dashed">
                    No active sessions found.
                  </div>
                )}
              </div>
            </div>
          </RBACGate>
        )}

        {activeTab === 'keys' && (
          <RBACGate allowedRoles={['Admin', 'Engineer']}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">API Keys</h2>
                  <p className="text-sm text-[var(--color-muted)]">Tokens for programmatic access to PredictMaint API.</p>
                </div>
                <button 
                  onClick={generateKey}
                  className="px-4 py-2 bg-[var(--color-primary)] text-black font-semibold rounded hover:brightness-110 transition-all text-sm"
                >
                  Generate New Key
                </button>
              </div>

              {newKey && <APIKeyReveal apiKey={newKey} />}

              <div className="overflow-hidden border border-[var(--color-border)] rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <tr>
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Created</th>
                      <th className="p-4 font-medium">Last Used</th>
                      <th className="p-4 font-medium">Expires</th>
                      <th className="p-4 font-medium">Scope</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {keys.map(k => (
                      <tr key={k.id} className="hover:bg-[var(--color-surface)]/50 transition-colors">
                        <td className="p-4 font-medium">{k.name}</td>
                        <td className="p-4 text-[var(--color-muted)]">{k.created}</td>
                        <td className="p-4 text-[var(--color-muted)]">{k.lastUsed}</td>
                        <td className="p-4 text-[var(--color-muted)]">{k.expires}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 text-xs">{k.scope}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleRevokeKey(k.id)} className="text-[var(--color-destructive)] hover:underline text-xs">Revoke</button>
                        </td>
                      </tr>
                    ))}
                    {keys.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[var(--color-muted)]">No API keys generated yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </RBACGate>
        )}

        {activeTab === 'audit' && (
          <RBACGate allowedRoles={['Admin']}>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Security Audit Log</h2>
                <button className="px-3 py-1.5 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-surface)] transition-colors">Export CSV</button>
              </div>
              <div className="overflow-hidden border border-[var(--color-border)] rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <tr>
                      <th className="p-4 font-medium">Timestamp</th>
                      <th className="p-4 font-medium">User</th>
                      <th className="p-4 font-medium">Event Type</th>
                      <th className="p-4 font-medium">Details</th>
                      <th className="p-4 font-medium">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {MOCK_AUDIT.map(a => (
                      <tr key={a.id} className="hover:bg-[var(--color-surface)]/50">
                        <td className="p-4 text-[var(--color-muted)] whitespace-nowrap">{a.time}</td>
                        <td className="p-4 font-medium">{a.user}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs border ${a.color}`}>{a.type}</span>
                        </td>
                        <td className="p-4 text-[var(--color-muted)] max-w-xs truncate">{a.details}</td>
                        <td className="p-4 font-mono text-xs text-[var(--color-muted)]">{a.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </RBACGate>
        )}
      </div>

      {confirmModal && confirmModal.isOpen && (
        <ConfirmPhraseModal
          phrase={confirmModal.phrase}
          action={confirmModal.action}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
