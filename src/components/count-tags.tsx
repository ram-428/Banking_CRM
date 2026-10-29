import type { ChecklistItem, ServiceChecklistItem } from "@/lib/types";

export type DocCounts = { pending: number; progress: number; approved: number; rejected: number };

export function tally(items: ServiceChecklistItem[]): DocCounts {
  return {
    pending: items.filter((item) => item.status === "Pending" && !item.linkedFrom).length,
    progress: items.filter((item) => !item.linkedFrom && (item.status === "Uploaded" || item.status === "Under Review")).length,
    approved: items.filter((item) => item.status === "Approved" || item.linkedFrom).length,
    rejected: items.filter((item) => !item.linkedFrom && (item.status === "Rejected" || item.status === "Expired")).length,
  };
}

export function applicationBucket(item: ChecklistItem): "Pending" | "In progress" | "Approved" | "Rejected" {
  if (item.status === "Approved") return "Approved";
  if (item.status === "Pending Upload") return "Pending";
  if (item.status === "Rejected" || item.status === "Expired") return "Rejected";
  return "In progress";
}

export function tallyApplication(items: ChecklistItem[]): DocCounts {
  const of = (bucket: ReturnType<typeof applicationBucket>) => items.filter((item) => applicationBucket(item) === bucket).length;
  return { pending: of("Pending"), progress: of("In progress"), approved: of("Approved"), rejected: of("Rejected") };
}

export function CountTags({ counts }: { counts: DocCounts }) {
  return (
    <div className="count-tags">
      <span className="count-tag tone-amber">Pending <b>{counts.pending}</b></span>
      <span className="count-tag tone-info">In progress <b>{counts.progress}</b></span>
      <span className="count-tag tone-olive">Approved <b>{counts.approved}</b></span>
      {counts.rejected > 0 && <span className="count-tag tone-danger">Rejected <b>{counts.rejected}</b></span>}
    </div>
  );
}
