"use client";
import { ReactNode } from "react";

interface RBACGateProps {
  allowedRoles?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * RBACGate - Disables Role-Based Access Control
 * Always renders children as RBAC has been removed from the system.
 */
export function RBACGate({ children }: RBACGateProps) {
  return <>{children}</>;
}
