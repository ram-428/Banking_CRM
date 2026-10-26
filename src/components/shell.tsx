"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { navFor, userName } from "@/lib/access";
import { markNotice } from "@/lib/actions";
import { useDesk } from "@/lib/store";
import { DeskSkeleton } from "./ui";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavIcon({ href }: { href: string }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (href === "/dashboard") {
    return (
      <svg {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1.4" />
        <rect x="14" y="3" width="7" height="7" rx="1.4" />
        <rect x="3" y="14" width="7" height="7" rx="1.4" />
        <rect x="14" y="14" width="7" height="7" rx="1.4" />
      </svg>
    );
  }
  if (href === "/tasks") {
    return (
      <svg {...props}>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6.5l1.2 1.2L7.5 5.5M4 12.5l1.2 1.2 2.3-2.2M4 18.5l1.2 1.2 2.3-2.2" />
      </svg>
    );
  }
  if (href === "/follow-ups") {
    return (
      <svg {...props}>
        <path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.2 2 2 0 0 1 4.1 1h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 8.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
      </svg>
    );
  }
  if (href === "/leads") {
    return (
      <svg {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />
      </svg>
    );
  }
  if (href === "/applications") {
    return (
      <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (href === "/verification") {
    return (
      <svg {...props}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (href === "/financials") {
    return (
      <svg {...props}>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 15v-4M12 15V8M16 15v-6" />
      </svg>
    );
  }
  if (href === "/users") {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  if (href === "/roles") {
    return (
      <svg {...props}>
        <circle cx="8" cy="15" r="3" />
        <path d="M11 15h10l-2 2 2 2h-4" />
        <path d="M13.5 12.5L16 10" />
      </svg>
    );
  }
  if (href === "/documents") {
    return (
      <svg {...props}>
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

const CRUMB: Record<string, string> = {
  dashboard: "Dashboard",
  tasks: "My tasks",
  "follow-ups": "Follow-ups",
  leads: "Leads",
  applications: "Applications",
  customers: "Customers",
  verification: "Verification",
  financials: "Financial profiles",
  users: "Users",
  roles: "Roles",
  documents: "Document master",
  audit: "Audit history",
  profile: "Profile",
  new: "New",
  checklist: "Checklist",
  invite: "Invitation",
  credit: "Credit review",
  banks: "Bank submission",
  agreement: "Agreement",
  delivery: "Loan delivery",
  close: "Closure",
};

function crumbLabel(segment: string) {
  if (CRUMB[segment]) return CRUMB[segment];
  if (/^[A-Za-z]{1,6}-?\d/.test(segment) || segment.length > 10) return "Details";
  return segment.replace(/-/g, " ");
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { state, replace, reset, user, ready } = useDesk();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<"search" | "bell" | "user" | null>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem("vrw.sidebar.collapsed") === "1");
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);

  const results = useMemo(() => {
    if (!state || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const companies = state.customers
      .filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((item) => ({ href: `/customers/${item.code}`, label: item.name, meta: item.code }));
    const apps = state.applications
      .filter((item) => {
        const customer = state.customers.find((row) => row.id === item.customerId);
        return `${item.number} ${customer?.name ?? ""}`.toLowerCase().includes(q);
      })
      .slice(0, 4)
      .map((item) => ({
        href: `/applications/${item.id}`,
        label: item.number,
        meta: state.customers.find((row) => row.id === item.customerId)?.name ?? "",
      }));
    return [...apps, ...companies];
  }, [query, state]);

  if (!ready || !state || !user) return <DeskSkeleton />;

  const groups = navFor(state);
  const unread = state.notices.filter((item) => !item.read);
  const crumbs = pathname.split("/").filter(Boolean).map((segment, index, all) => ({
    href: `/${all.slice(0, index + 1).join("/")}`,
    label: crumbLabel(segment),
    last: index === all.length - 1,
  }));

  return (
    <div className={collapsed ? "shell is-collapsed" : "shell"}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      {open && <button className="backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="side-brand">
          <Link href="/dashboard">
            <span className="mark">V</span>
            <span className="brand-name">VR Worldwide</span>
          </Link>
          <button
            className="collapse-btn"
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={() => {
              setCollapsed((value) => {
                localStorage.setItem("vrw.sidebar.collapsed", value ? "0" : "1");
                return !value;
              });
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              {collapsed ? <path d="M9 6l6 6-6 6M4 6v12" /> : <path d="M15 6l-6 6 6 6M20 6v12" />}
            </svg>
          </button>
        </div>
        <nav className="side-nav" aria-label="Desk">
          {groups.map((group) => {
            const closed = closedGroups[group.section] === true;
            return (
              <div key={group.section} className={closed ? "nav-group is-closed" : "nav-group"}>
                <button
                  className="nav-section"
                  type="button"
                  aria-expanded={!closed}
                  onClick={() => setClosedGroups((current) => ({ ...current, [group.section]: !closed }))}
                >
                  <span>{group.section}</span>
                  <svg className="nav-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="nav-links">
                  {group.items.map((item) => {
                    const current = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href} className="nav-link" aria-current={current ? "page" : undefined} title={item.label}>
                        <span className="nav-ico">
                          <NavIcon href={item.href} />
                        </span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" type="button" aria-label="Open navigation" onClick={() => setOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <nav className="crumb-bar" aria-label="Breadcrumb">
            <Link href="/dashboard">Home</Link>
            {crumbs.map((crumb) => (
              <span key={crumb.href} style={{ display: "contents" }}>
                <span className="crumb-sep" aria-hidden="true">
                  /
                </span>
                {crumb.last ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
              </span>
            ))}
          </nav>
          <div className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              aria-label="Search companies and applications"
              placeholder="Search company, code, or application"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setMenu("search");
              }}
              onFocus={() => setMenu("search")}
            />
            {menu === "search" && query.trim().length >= 2 && (
              <div className="search-pop">
                {results.length === 0 && <div style={{ padding: 10 }}>No matching company or application.</div>}
                {results.map((result) => (
                  <Link key={result.href} href={result.href}>
                    <strong>{result.label}</strong>
                    <div className="hint">{result.meta}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="top-actions">
            <div style={{ position: "relative" }}>
              <button className="icon-btn" type="button" aria-label="Notifications" onClick={() => setMenu(menu === "bell" ? null : "bell")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9" />
                  <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
                {unread.length > 0 && <span className="dot-count">{unread.length}</span>}
              </button>
              {menu === "bell" && (
                <div className="menu" style={{ width: 320 }}>
                  {state.notices.slice(0, 6).map((item) => (
                    <Link key={item.id} href={item.href} onClick={() => replace(markNotice(state, item.id))}>
                      <strong>{item.title}</strong>
                      <div className="hint">{item.detail}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button className="user-chip" type="button" aria-label="Account menu" onClick={() => setMenu(menu === "user" ? null : "user")}>
                <span className="avatar">{initials(user.name)}</span>
                <span className="who">
                  {user.name}
                  <span>{user.role}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {menu === "user" && (
                <div className="menu">
                  <Link href="/profile">Profile and activity</Link>
                  <Link href="/portal">Customer portal</Link>
                  <button
                    className="menu-item"
                    type="button"
                    onClick={() => {
                      reset();
                      router.push("/");
                    }}
                  >
                    Reset demo data
                  </button>
                  <button
                    className="menu-item"
                    type="button"
                    onClick={() => {
                      replace({ ...state, sessionUserId: null });
                      router.push("/");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="content">{children}</main>
      </div>
    </div>
  );
}

export function actorName(state: NonNullable<ReturnType<typeof useDesk>["state"]>, id?: string) {
  return userName(state, id);
}
