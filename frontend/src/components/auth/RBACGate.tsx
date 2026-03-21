"use client";
import { ReactNode } from "react";

interface RBACGateProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RBACGate({ allowedRoles, children, fallback = null }: RBACGateProps) {
  // Mock role for now, imagine getting this from NextAuth session
  const userRole = "Admin"; 
  
  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
