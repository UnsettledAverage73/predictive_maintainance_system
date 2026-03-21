'use client';

import { ReactNode, useEffect, useState } from 'react';

// Define the shape manually to avoid creating deep dependency chains.
// In a mature app this might come from a robust global store.
interface RBACGateProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export function RBACGate({ children, allowedRoles, fallback = null }: RBACGateProps) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Determine user role (e.g. from context, decode JWT, or API)
    // Here we're mocking that the user is an Admin so the UI works naturally.
    setRole('Admin');
  }, []);

  // Show nothing if loading or the state hasn't resolved yet
  if (!role) return null; 

  // If role is not matched, unmount real children from DOM completely and show fallback.
  if (!allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
