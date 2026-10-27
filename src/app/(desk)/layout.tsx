"use client";

import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { DeskSkeleton } from "@/components/ui";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <Suspense fallback={<DeskSkeleton />}>{children}</Suspense>
    </Shell>
  );
}
