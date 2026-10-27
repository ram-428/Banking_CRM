"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DeskSkeleton, Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { userName } from "@/lib/access";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

function Queue() {
  const { state } = useDesk();
  const params = useSearchParams();
  const preset = params.get("application") ?? "All";
  const [applicationId, setApplicationId] = useState(preset);
  const [status, setStatus] = useState("All");
  const [reviewer, setReviewer] = useState("All");
  if (!state) return null;
  const rows = state.versions.filter((version) => {
    if (applicationId !== "All" && version.applicationId !== applicationId) return false;
    if (status !== "All" && version.status !== status) return false;
    if (reviewer !== "All" && version.assigneeId !== reviewer) return false;
    return true;
  });
  return (
    <Gate module="Verification">
      <div className="page">
        <PageHeader title="Verification queue" lede="Approve or reject one exact version. An upload is never an approval." />
        <div className="filters">
          <select aria-label="Application" value={applicationId} onChange={(event) => setApplicationId(event.target.value)}>
            <option value="All">All applications</option>
            {state.applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.number}
              </option>
            ))}
          </select>
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            <option>Awaiting Review</option>
            <option>Under Review</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
          <select aria-label="Reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)}>
            <option value="All">All reviewers</option>
            {state.users
              .filter((user) => user.role === "Operations" || user.role === "Credit Analyst")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Document</th>
              <th>Application</th>
              <th>Version</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((version) => {
              const item = state.checklist.find((row) => row.id === version.checklistItemId);
              const app = state.applications.find((row) => row.id === version.applicationId);
              const customer = state.customers.find((row) => row.id === app?.customerId);
              return (
                <tr key={version.id}>
                  <td>
                    {item?.name}
                    <div className="hint">{version.fileName}</div>
                  </td>
                  <td>
                    {app?.number}
                    <div className="hint">
                      {customer?.code} · {customer?.name}
                    </div>
                  </td>
                  <td>v{version.version}</td>
                  <td>
                    {version.uploadedBy}
                    <div className="hint">{formatWhen(version.uploadedAt)}</div>
                  </td>
                  <td>
                    <StatusText value={version.status} />
                    <div className="hint">{version.assigneeId ? userName(state, version.assigneeId) : "Unassigned"}</div>
                  </td>
                  <td>
                    <Link href={`/verification/${version.id}`}>Open review</Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>Nothing in this queue.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <Queue />
    </Suspense>
  );
}
