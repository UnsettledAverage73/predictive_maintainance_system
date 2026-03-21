export function SecurityBadge({ status }: { status: 'secure' | 'partial' | 'at-risk' }) {
  const colors = {
    secure: 'text-green-500 bg-green-500/10 border-green-500/20',
    partial: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'at-risk': 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${colors[status]}`}>
      <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span className="text-xs font-semibold capitalize">{status}</span>
    </div>
  );
}
