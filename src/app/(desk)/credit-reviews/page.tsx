"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Gate, PageHeader, StatusText, DataTable } from "@/components/ui";
import { applicationView, userName } from "@/lib/access";
import { formatWhen } from "@/lib/format";
import { useDesk } from "@/lib/store";

export default function CreditReviewsPage() {
  const { state } = useDesk();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!state) return [];
    return state.applications.filter((app) => {
      const { customer } = applicationView(state, app.id);
      const blob = `${app.number} ${customer?.name ?? ""} ${customer?.code ?? ""} ${app.status}`.toLowerCase();
      return !q || blob.includes(q.toLowerCase());
    });
  }, [state, q]);

  if (!state) return null;

  return (
    <Gate module="Credit">
      <div className="page">
        <PageHeader title="Credit review" lede="Eligibility is a human decision. Demo AI findings stay on the application and do not set this result." />
        <div className="filters">
          <input placeholder="Search application or company" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search credit reviews" />
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Application</th>
              <th>Company</th>
              <th>Profile version</th>
              <th>Decision</th>
              <th>Notes</th>
              <th>Conditions</th>
              <th>Reviewed by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => {
              const { customer } = applicationView(state, app.id);
              const review = state.reviews.find((item) => item.applicationId === app.id);
              return (
                <tr key={app.id}>
                  <td>
                    <Link className="link" href={`/applications/${app.id}/credit`}>
                      {app.number}
                    </Link>
                  </td>
                  <td>
                    {customer?.name ?? "None"}
                    <div className="hint">{customer?.code}</div>
                  </td>
                  <td>{review?.profileLabel ?? app.snapshotLabel}</td>
                  <td>{review ? <StatusText value={review.decision} /> : "No decision yet"}</td>
                  <td>{review?.notes || "None"}</td>
                  <td>{review?.conditions || "None"}</td>
                  <td>
                    {review ? userName(state, review.reviewerId) : "Unassigned"}
                    <div className="hint">{formatWhen(review?.reviewedAt)}</div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>No applications match this search.</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </Gate>
  );
}
