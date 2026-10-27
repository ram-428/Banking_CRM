"use client";

import { useEffect } from "react";
import { DeskSkeleton } from "@/components/ui";

export default function NewLeadPage() {
  useEffect(() => {
    sessionStorage.setItem("vrw-open-create", "lead");
    window.location.replace("/leads");
  }, []);
  return <DeskSkeleton />;
}
