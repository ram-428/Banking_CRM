"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ApplicationFrame } from "@/components/application-frame";
import { StatusText } from "@/components/ui";
import { useDesk } from "@/lib/store";

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useDesk();
  const items = state?.checklist.filter((item) => item.applicationId === id) ?? [];
  const groups = [...new Set(items.map((item) => item.category))];
  return (
    <ApplicationFrame id={id} lede="This checklist was copied when the application was created.">
      {groups.map((group) => (
        <section key={group} style={{ marginBottom: 22 }}>
          <h2 className="block-title">{group}</h2>
          <table className="data">
            <thead>
              <tr>
                <th>Document</th>
                <th>Requirement</th>
                <th>Stage</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((item) => item.category === group)
                .map((item) => {
                  const latest = state?.versions.find((version) => version.checklistItemId === item.id);
                  return (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.instructions && <div className="hint">{item.instructions}</div>}
                      </td>
                      <td>
                        {item.requirement}
                        {item.requiredNow ? "" : " · not blocking"}
                      </td>
                      <td>{item.stage}</td>
                      <td>
                        <StatusText value={item.status} />
                      </td>
                      <td>
                        {latest ? (
                          <Link href={`/verification/${latest.id}`}>Open version {latest.version}</Link>
                        ) : (
                          <span className="hint">{item.customerUpload ? "Waiting for the customer" : "Internal upload"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
      ))}
      {items.length === 0 && <p>No checklist was stored for this application.</p>}
    </ApplicationFrame>
  );
}
