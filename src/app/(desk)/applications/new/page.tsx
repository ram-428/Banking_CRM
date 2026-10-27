"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { DeskSkeleton } from "@/components/ui";

function OpenApplicationDialog() {
  const params = useSearchParams();
  useEffect(() => {
    const customer = params.get("customer");
    sessionStorage.setItem("vrw-open-create", "application");
    if (customer) sessionStorage.setItem("vrw-open-customer", customer);
    else sessionStorage.removeItem("vrw-open-customer");
    window.location.replace("/applications");
  }, [params]);
  return <DeskSkeleton />;
}

export default function NewApplicationPage() {
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <OpenApplicationDialog />
    </Suspense>
  );
}
