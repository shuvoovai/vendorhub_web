"use client";

import type { ReactNode } from "react";
import { useSession } from "@/components/app-providers";

/**
 * Shows its children only to a logged-in ADMIN (e.g. shop counts and price comparison).
 * Display only: the real access rules live on the server.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return user?.role === "ADMIN" ? children : null;
}
