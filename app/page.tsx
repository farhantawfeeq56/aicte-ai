"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { CaseRecord } from "./api/demo/route";

type Dashboard = "institution" | "regional" | "bureau" | "committee" | "authority" | "officer";
type State = { cases: CaseRecord[]; activity: { id: string; text: string; time: string }[] };
const workspaces: Record<Dashboard, { label: string; category: string; identity: string; role: string; initials: string; mark: string }> = {
  institution: { label: "Institution portal", category: "COLLEGE ACCOUNT", identity: "Northfield Institute", role: "Institution administrator", initials: "NI", mark: "N" },
  regional: { label: "Regional Officer", category: "REGIONAL OVERSIGHT", identity: "Regional Office", role: "Regional Officer", initials: "RO", mark: "R" },
  bureau: { label: "Regulation / Bureau", category: "REGULATION & BUREAU", identity: "Bureau Operations", role: "Regulation/Bureau Officer", initials: "RB", mark: "B" },
  committee: { label: "Scrutiny / EVC Committee", category: "SCRUTINY & FIELD REVIEW", identity: "Review Committee", role: "Scrutiny/EVC Committee Member", initials: "SC", mark: "C" },
  authority: { label: "SHC / SAC / Decision Authority", category: "HEARING & DECISION", identity: "Decision Office", role: "SHC/SAC/Decision Authority", initials: "DA", mark: "A" },
  officer: { label: "Assigned Officer", category: "OFFICER WORK QUEUE", identity: "Assigned Officer", role: "Application Officer", initials: "AO", mark: "O" },
};
const sideLinks: Record<Dashboard, { label: string; icon: string; anchor: string }[]> = {
  institution: [{ label: "Overview", icon: "▦", anchor: "page-top" }, { label: "Applications", icon: "▤", anchor: "application-list" }, { label: "Documents", icon: "▧", anchor: "document-list" }, { label: "Programs & profile", icon: "◫", anchor: "page-top" }],
  regional: [{ label: "Regional case overview", icon: "▦", anchor: "page-top" }, { label: "Assigned applications", icon: "▤", anchor: "assigned-queue" }, { label: "Escalations", icon: "◷", anchor: "officer-activity" }],
  bureau: [{ label: "Case overview", icon: "▦", anchor: "page-top" }, { label: "Route configuration", icon: "⇢", anchor: "workflow-heading" }, { label: "Stage history", icon: "☷", anchor: "stage-flow" }],
  committee: [{ label: "Scrutiny queue", icon: "▤", anchor: "committee-scrutiny-queue" }, { label: "EVC inspection queue", icon: "⌖", anchor: "evc-queue" }, { label: "Visit schedule", icon: "▦", anchor: "visit-schedule" }],
  authority: [{ label: "SHC / SAC hearings", icon: "◷", anchor: "authority-queue" }, { label: "Decision queue", icon: "✓", anchor: "authority-queue" }, { label: "Decision workflow", icon: "☷", anchor: "authority-queue" }],
  officer: [{ label: "My assigned applications", icon: "▤", anchor: "officer-queue" }],
};
const tour: Dashboard[] = ["institution", "regional", "bureau", "committee", "authority"];
const titles: Record<Dashboard, [string, string]> = {
  institution: ["Institution dashboard", "Manage applications, documents and approval status."],
  regional: ["Regional Officer dashboard", "Monitor regional applications, pendency and escalations."],
  bureau: ["Regulation / Bureau workspace", "Review application routes and coordinate regulatory workflow stages."],
  committee: ["Scrutiny / EVC Committee workspace", "Review assigned applications, coordinate inspections and record findings."],
  authority: ["SHC / SAC / Decision Authority", "Review applicable hearings and decision-stage cases. SHC/SAC is case-specific."],
  officer: ["Assigned Officer work queue", "Review applications assigned to you and their current stage."],
};
const suggestions: Record<Dashboard, string[]> = {
  institution: ["What is the status of my application?", "Which documents have I uploaded?", "What should I do next?"],
  regional: ["Show regional pending cases", "Which applications are overdue?", "Where are escalations needed?"],
  bureau: ["Explain this application’s route", "Who owns the current stage?", "What happens after this stage?"],
  committee: ["Show pending scrutiny", "Which EVC visits need scheduling?", "Are any reports overdue?", "Which cases need action today?"],
  authority: ["Show cases awaiting a decision", "Which cases have an SHC hearing?", "Is SAC or SHC required for every case?"],
  officer: ["Show my pending applications", "What is due next?"],
};
const routeStages: Record<CaseRecord["route"], string[]> = {
  A: ["Application submitted", "Document/data validation", "APH rule-engine routing", "Scrutiny", "Re-scrutiny (if required)", "EVC (if required)", "SAC / SHC (if required)", "Competent authority decision", "Undertaking / conditions", "Compliance monitoring", "Closed / escalated"],
  B: ["Application submitted", "Document/data validation", "APH rule-engine routing", "Scrutiny + EVC", "Re-scrutiny (if required)", "EVC (if required)", "SAC / SHC (if required)", "Competent authority decision", "Undertaking / conditions", "Compliance monitoring", "Closed / escalated"],
  C: ["Application submitted", "Document/data validation", "APH rule-engine routing", "EVC", "Re-scrutiny (if required)", "EVC (if required)", "SAC / SHC (if required)", "Competent authority decision", "Undertaking / conditions", "Compliance monitoring", "Closed / escalated"],
};
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></>, arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>, close: <path d="m18 6-12 12M6 6l12 12"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.file}</svg>;
}

export default function Home() {
  const [dashboard, setDashboard] = useState<Dashboard>("institution");
  const [data, setData] = useState<State | null>(null);
  const [selectedId, setSelectedId] = useState("AP-2025-0148");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(sideLinks.institution[0].label);
  const [tourStep, setTourStep] = useState(-1);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [filter, setFilter] = useState("");
  const [routeChoice, setRouteChoice] = useState<CaseRecord["route"]>("B");
  const [officerName, setOfficerName] = useState("Meera Kulkarni");
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const selected = data?.cases.find((item) => item.id === selectedId) ?? data?.cases[0];
  const institutionCases = data?.cases.filter((item) => item.college === "Northfield Institute of Technology") ?? [];
  const institutionSelected = institutionCases.find((item) => item.id === selectedId) ?? institutionCases[0];

  const refresh = useCallback(async () => {
    const response = await fetch("/api/demo", { cache: "no-store" });
    if (!response.ok) throw new Error("Demo service is unavailable. Refresh to reconnect.");
    setData(await response.json() as State);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("workspace") === "committee") startTransition(() => setDashboard("committee"));
    if (params.get("tour") === "evc-checklist") startTransition(() => setTourStep(3));
    const controller = new AbortController();
    fetch("/api/demo", { cache: "no-store", signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Demo service is unavailable. Refresh to reconnect."); return response.json() as Promise<State>; })
      .then(setData)
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (flash) { const timer = setTimeout(() => setFlash(""), 3200); return () => clearTimeout(timer); } }, [flash]);

  async function mutate(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const result = await response.json() as State & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not complete this demo action.");
      setData(result); setFlash(action === "create" ? "Application created and assigned to the selected officer" : action === "schedule" ? "EVC visit date saved" : action === "upload" ? extra.mode === "supporting" ? "Supporting document added to the selected application" : "Application submitted with supporting documents" : action === "route" ? "Workflow route updated" : "Application stage updated");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not complete this action."); return false; }
    finally { setBusy(false); }
  }
  async function upload(file?: File, mode: "application" | "supporting" = "application") {
    if (!file) return;
    const success = await mutate("upload", { name: file.name, size: file.size, mode, id: institutionSelected?.id });
    if (success && mode === "application") setSelectedId("AP-2025-0152");
  }
  function showDashboard(next: Dashboard) { setDashboard(next); setActiveSection(sideLinks[next][0].label); setReply(""); setNotificationOpen(false); }
  function selectWorkspace(next: Dashboard) { showDashboard(next); setRouteChoice(selected?.route ?? "B"); setTourStep(-1); setSwitcherOpen(false); }
  function openCase(id: string, target: Dashboard) { const record = data?.cases.find((item) => item.id === id); if (record) setRouteChoice(record.route); setSelectedId(id); showDashboard(target); }
  const tourFocus = (target: Dashboard) => tourStep >= 0 && dashboard === target ? "tour-focus" : "";
  function advanceTour() {
    if (tourStep >= tour.length - 1) { setTourStep(-1); return; }
    const next = tourStep + 1; setTourStep(next); showDashboard(tour[next]);
  }
  function startTour() { setTourStep(0); showDashboard("institution"); }
  const chooseSuggestion = (text: string) => {
    const c = selected;
    const responses: Record<Dashboard, string> = {
      institution: `Application ${institutionSelected?.id} for ${institutionSelected?.college} is ${institutionSelected?.status.toLowerCase()} at “${institutionSelected?.stage}”. ${institutionSelected?.files.length ?? 0} supporting documents are on file. Monitor the application for the next review stage.`,
      regional: `There are ${data?.cases.length ?? 0} fictional applications in the regional overview. ${data?.cases.filter((x) => x.status === "Overdue").length ?? 0} are overdue. Review the assigned queue and recent escalation history; statutory decisions remain with the authorized authority.`,
      bureau: `Route ${c?.route} is selected for ${c?.college}. Current stage: ${c?.stage}. Responsible role: ${c?.stage.includes("EVC") || c?.stage.includes("Inspection") ? "Scrutiny/EVC Committee Member" : c?.stage.includes("decision") ? "Decision Authority" : "Regulation/Bureau Officer"}. SAC/SHC is conditional and is not part of every route. This demo does not make statutory decisions.`,
      committee: `Review scrutiny-stage cases and EVC visits in the committee workspace. The checklist records inspection findings and any SAC/SHC recommendation; the authorized decision-maker confirms the applicable process.`,
      authority: `The authority queue shows cases at SHC/SAC hearing or decision stages. These stages are case-specific; the demo does not record or issue an official statutory decision.`,
      officer: `You have ${data?.cases.filter((item) => item.officer === officerName).length ?? 0} applications assigned to ${officerName}. Review the current stage and next due dates in your queue.`,
    };
    setReply(`${text}\n\n${responses[dashboard]}`);
  };
  const notifications = useMemo(() => [
    { title: "Inspection report overdue", detail: "Cedar Ridge · AP-2025-0119 · 3 days", caseId: "AP-2025-0119", tone: "red" },
    { title: "Scrutiny task escalated", detail: "Lakeview College · AP-2025-0132 · 12 days", caseId: "AP-2025-0132", tone: "red" },
    { title: "EVC visit to schedule", detail: "Northfield Institute · due 28 Mar", caseId: "AP-2025-0148", tone: "amber" },
    { title: "Authority decision pending", detail: "Meridian · AP-2025-0151 · review required", caseId: "AP-2025-0151", tone: "blue" },
    { title: "SHC hearing review", detail: "Saffron Valley · AP-2025-0126 · case-specific", caseId: "AP-2025-0126", tone: "amber" },
  ], []);
  const unread = notifications.length;
  if (!data) return <div className="loading-screen"><div className="brand-mark">A</div><p>Connecting to the fictional demo workspace…</p>{error && <button onClick={() => refresh().catch((e: Error) => setError(e.message))}>Retry connection</button>}</div>;

  return <div className={`app-shell role-${dashboard}`}>
    <aside className={`sidebar sidebar-${dashboard}`}>
      <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); showDashboard("institution"); }}><span className="brand-mark">{workspaces[dashboard].mark}</span><span>{dashboard === "institution" ? <>Northfield<span className="brand-light">.edu</span></> : <>AICTE<span className="brand-light">.flow</span></>}<small>{workspaces[dashboard].category}</small></span></a>
      <div className="workspace-label">{dashboard === "institution" ? "YOUR INSTITUTION" : workspaces[dashboard].category}</div>
      <nav className="main-nav" aria-label={`${workspaces[dashboard].label} navigation`}>{sideLinks[dashboard].map((item, index) => <a key={item.label} href={`#${item.anchor}`} className={`nav-item ${activeSection === item.label ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveSection(item.label); document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span className="nav-icon">{item.icon}</span>{item.label}{dashboard === "regional" && index === 0 && <span className="nav-count">2</span>}{dashboard === "committee" && index === 0 && <span className="nav-count">{data.cases.filter((c) => c.stage.toLowerCase().includes("scrutiny")).length}</span>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="demo-flag"><span className="pulse-dot"/> Demo workspace <span>FICTIONAL</span></div><button className="replay-link" onClick={startTour}>↗ &nbsp; Replay product tour</button><div className="profile"><div className="avatar">{workspaces[dashboard].initials}</div><div><b>{workspaces[dashboard].identity}</b><small>{workspaces[dashboard].role}</small></div><span className="profile-menu">···</span></div></div>
    </aside>
    <div className="workspace">
      <header className={`topbar topbar-${dashboard}`}><div className="breadcrumbs"><span>{workspaces[dashboard].label}</span><span className="crumb-sep">/</span><b>{titles[dashboard][0]}</b><span className="env-pill">FICTIONAL DATA</span></div><div className="top-actions"><div className="workspace-switcher"><button className="switcher-button" aria-haspopup="listbox" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen(!switcherOpen)}><span>VIEW AS</span><b>{workspaces[dashboard].label}</b><i>⌄</i></button>{switcherOpen && <div className="switcher-menu" role="listbox" aria-label="Switch demo workspace">{(Object.keys(workspaces) as Dashboard[]).map((key) => <button key={key} role="option" aria-selected={key === dashboard} className={key === dashboard ? "selected-workspace" : ""} onClick={() => selectWorkspace(key)}><span className={`switcher-icon icon-${key}`}>{workspaces[key].mark}</span><span><b>{workspaces[key].label}</b><small>{workspaces[key].role}</small></span>{key === dashboard && <i>✓</i>}</button>)}</div>}</div><label className="search-box"><Icon name="search" size={16}/><input aria-label="Search demo records" placeholder="Search applications…" value={filter} onChange={(e) => setFilter(e.target.value)}/><kbd>⌘ K</kbd></label><button className={`icon-button bell-button ${notificationOpen ? "pressed" : ""}`} aria-label={`Notifications (${unread} reminders)`} onClick={() => setNotificationOpen(!notificationOpen)}><Icon name="bell"/><i>{unread}</i></button><div className="header-divider"/><button className="help-button" onClick={startTour}>? <span>Tour</span></button></div>
        {notificationOpen && <div className="notification-popover"><div className="popover-title"><div><b>Notifications</b><small>{unread} reminders · fictional demo</small></div><button className="icon-button small-close" aria-label="Close notifications" onClick={() => setNotificationOpen(false)}><Icon name="close" size={16}/></button></div>{notifications.map((n) => <button key={n.title} className="notification-item" onClick={() => openCase(n.caseId, n.title.includes("Authority") || n.title.includes("SHC") ? "authority" : n.title.includes("Inspection") || n.title.includes("EVC") ? "committee" : "regional")}><span className={`notice-dot ${n.tone}`}/><span><b>{n.title}</b><small>{n.detail}</small></span><Icon name="arrow" size={15}/></button>)}<div className="popover-foot">Reminders and escalations reflect the demo case records.</div></div>}
      </header>
      <main className="page-content" id="page-top">
        <div className="page-heading"><div><div className="heading-meta"><span className="status-dot green"/> AICTE approval workflow <span className="meta-sep">·</span> Last synced just now</div><h1>{titles[dashboard][0]}</h1><p>{titles[dashboard][1]}</p></div><div className="heading-buttons"><button className="button-secondary" onClick={startTour}><span>▷</span> Start product tour</button>{dashboard === "institution" && <label className="button-primary upload-cta"><Icon name="upload" size={16}/> Upload application<input type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" onChange={(e) => upload(e.target.files?.[0])}/></label>}</div></div>
        {(tourStep >= 0 || error || flash) && <div className={`message-banner ${error ? "error-banner" : tourStep >= 0 ? "tour-banner" : "success-banner"}`}>
          {error ? <><b>Action needs attention</b><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16}/></button></> : tourStep >= 0 ? <><span className="tour-step-count">0{tourStep + 1} <i>/ 05</i></span><div><b>{["Your institution workspace", "Regional case oversight", "Regulation and routing", "Scrutiny and EVC review", "SHC / SAC and decision authority"][tourStep]}</b><span>{["Upload an application and review your submitted documents.", "Monitor regional pendency, assigned applications and escalations.", "Review configured routes; SHC/SAC remains conditional.", "Review scrutiny workload, schedule required EVC visits and record findings.", "Review applicable hearings and decision-stage cases. The demo does not issue statutory decisions."][tourStep]}</span></div>{dashboard === "committee" && <a className="tour-checklist-link" href={`/checklist?case=${encodeURIComponent(selectedId)}&tour=evc-checklist`}>Open visit checklist <Icon name="arrow" size={13}/></a>}<button className="tour-next" onClick={advanceTour}>{tourStep === 4 ? "Finish tour" : "Next dashboard"} <Icon name="arrow" size={14}/></button><button className="tour-dismiss" onClick={() => setTourStep(-1)}>Dismiss</button></> : <><Icon name="check" size={16}/><span>{flash}</span><button onClick={() => setFlash("")} aria-label="Dismiss message"><Icon name="close" size={16}/></button></>}
        </div>}
        <div className="content-grid"><section className="primary-column">
          {dashboard === "institution" && <>
            <div className="metric-row"><Metric label="Active applications" value={String(institutionCases.length).padStart(2, "0")} note="For Northfield Institute" icon="▤"/><Metric label="Action required" value={String(institutionCases.filter((c) => c.status === "Overdue").length).padStart(2, "0")} note="Review pending items" icon="!" alert/><Metric label="Approval validity" value="2025–26" note="Renewal window opens soon" icon="◷"/></div>
            <div className="section-title" id="application-list"><div><h2>Applications</h2><span>Applications submitted by your institution</span></div><button className="text-action" onClick={() => showDashboard("bureau")}>View workflow <Icon name="arrow" size={14}/></button></div>
            <CaseTable cases={institutionCases} filter={filter} selectedId={institutionSelected?.id ?? selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
            <div className="section-title compact-title" id="document-list"><div><h2>Supporting documents</h2><span>{institutionSelected?.college ?? "Northfield Institute of Technology"} · {institutionSelected?.id ?? "No application selected"}</span></div><label className="text-action document-upload"><Icon name="upload" size={15}/> Add document<input type="file" onChange={(e) => upload(e.target.files?.[0], "supporting")}/></label></div>
            <div className="document-list">{institutionSelected?.files.map((file) => <div className="document-row" key={file.name}><div className="file-icon"><Icon name="file" size={17}/></div><div className="document-name"><b>{file.name}</b><small>{file.kind} · {(file.size / 1000000).toFixed(1)} MB</small></div><span className="status-tag status-green"><Icon name="check" size={12}/> Received</span></div>)}{!institutionSelected?.files.length && <div className="empty-state">No supporting documents yet. Upload a file to add one.</div>}</div>
          </>}
          {dashboard === "bureau" && selected && <>
            <div className="route-case-strip"><div className="institution-avatar">{selected.college.charAt(0)}</div><div><b>{selected.college}</b><small>{selected.id} <span>·</span> {selected.type}</small></div><Status status={selected.status}/></div>
            <div className="workflow-card" id="workflow-heading"><div className="workflow-heading"><div><h2>Configure workflow</h2><p>Select a route for this application. The prescribed process remains case-specific.</p></div><span className="config-label">CONFIGURABLE</span></div><div className="route-options">{(["A", "B", "C"] as const).map((r) => <button key={r} className={`route-option ${routeChoice === r ? "chosen" : ""}`} onClick={() => setRouteChoice(r)}><span className="route-radio"/><span><b>Route {r}</b><small>{r === "A" ? "Scrutiny" : r === "B" ? "Scrutiny + EVC" : "EVC route"}</small></span><span className="route-option-end">{r === selected.route ? "CURRENT" : ""}</span></button>)}</div><button disabled={busy || routeChoice === selected.route} className="button-primary save-route" onClick={() => mutate("route", { id: selected.id, route: routeChoice })}>Apply route <Icon name="arrow" size={15}/></button></div>
            <div className="section-title"><div><h2>Selected workflow · Route {selected.route}</h2><span>Current position and responsible next action</span></div><span className="live-pill"><i/> LIVE STATUS</span></div>
            <div className={`stage-flow ${tourFocus("bureau")}`} id="stage-flow">{routeStages[selected.route].map((stage, i) => <div className={`stage-item ${i === stageIndex(selected) ? "current" : i < stageIndex(selected) ? "complete" : ""}`} key={stage}><div className="stage-connector"/><div className="stage-node">{i === 0 ? <Icon name="check" size={14}/> : String(i + 1).padStart(2, "0")}</div><div className="stage-detail"><b>{stage}</b><small>{i === 0 ? "Submitted · 12 Mar 2025" : stage === "APH rule-engine routing" ? "Simulated route selection based on application data" : stage.includes("if required") ? "Conditional stage · confirm whether applicable" : stage === "Competent authority decision" ? "Decision reserved to competent authority" : stage === "Compliance monitoring" ? "Track undertaking deadlines and escalate overdue cases" : "Assigned role · action pending"}</small>{stage.includes("if required") && <span className="conditional-chip">CONDITIONAL</span>}</div>{i === 0 ? <span className="stage-state">DONE</span> : i === stageIndex(selected) ? <span className="stage-state active-state">CURRENT</span> : null}</div>)}</div>
            <div className="authority-note"><span className="authority-icon">⚖</span><span><b>Decision integrity</b><small>Outcomes below are demo-only; statutory decisions remain exclusively with the competent authority.</small></span></div>
            {selected.stage === "Competent authority decision" ? <div className="route-options"><button className="button-secondary" disabled={busy} onClick={() => mutate("decision", { id: selected.id, outcome: "approved" })}>Approve</button><button className="button-secondary" disabled={busy} onClick={() => mutate("decision", { id: selected.id, outcome: "rejected" })}>Reject</button><button className="button-secondary" disabled={busy} onClick={() => mutate("decision", { id: selected.id, outcome: "further-action" })}>Further action</button></div> : selected.stage === "Compliance monitoring" ? <div className="route-options"><button className="button-secondary" disabled={busy} onClick={() => mutate("compliance", { id: selected.id, outcome: "compliant" })}>Compliant · close</button><button className="button-secondary" disabled={busy} onClick={() => mutate("compliance", { id: selected.id, outcome: "overdue" })}>Overdue · escalate</button></div> : selected.stage === "Further action required" ? <div className="route-options"><button className="button-secondary" disabled={busy} onClick={() => mutate("advance", { id: selected.id, stage: "Scrutiny" })}>Return to scrutiny</button></div> : <div className="route-options"><button className="button-secondary advance-button" disabled={busy || ["Closed", "Escalated", "Rejected / further action"].includes(selected.stage)} onClick={() => mutate("advance", { id: selected.id })}>Simulate next stage <Icon name="arrow" size={15}/></button>{selected.stage.includes("if required") && <button className="button-secondary" disabled={busy} onClick={() => mutate("advance", { id: selected.id, skip: true })}>Not required · skip</button>}</div>}
          </>}
          {dashboard === "regional" && <>
            <div className="metric-row"><Metric label="Assigned cases" value={String(data.cases.filter((c) => c.officer !== "Unassigned").length).padStart(2, "0")} note="Across 3 processing stages" icon="▤"/><Metric label="Overdue" value="02" note="Escalation reminder sent" icon="!" alert/><Metric label="Due this week" value="03" note="Next deadline · 19 Mar" icon="◷"/></div>
            <div className={`workload-band ${tourFocus("regional")}`} id="officer-workload"><div className="workload-label"><span>OFFICER WORKLOAD</span><b>Assigned cases by officer</b></div>{["Meera Kulkarni", "Arjun Nair", "Devika Rao"].map((name) => { const n = data.cases.filter((c) => c.officer === name).length; return <div className="workload-person" key={name}><span>{name}</span><div className="workload-track"><i style={{ width: `${Math.min(n * 24, 100)}%` }}/></div><b>{n}</b></div>; })}</div>
            <div className="workflow-card new-application"><div className="workflow-heading"><div><h2>Register new application</h2><p>Assign an officer now; the application will appear in both queues.</p></div></div><form className="application-form" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const ok = await mutate("create", { college: values.get("college"), program: values.get("program"), officer: values.get("officer"), route: values.get("route") }); if (ok) form.reset(); }}><label>Institution<input name="college" required maxLength={120} placeholder="College / institution name"/></label><label>Program<input name="program" required maxLength={120} placeholder="e.g. B.Tech · Computer Science"/></label><label>Assigned officer<select name="officer" defaultValue="Meera Kulkarni"><option>Meera Kulkarni</option><option>Arjun Nair</option><option>Devika Rao</option></select></label><label>Route<select name="route" defaultValue="B"><option value="A">A · Scrutiny</option><option value="B">B · Scrutiny + EVC</option><option value="C">C · EVC</option></select></label><button className="button-primary" disabled={busy}>Create application</button></form></div>
            <div className="section-title" id="assigned-queue"><div><h2>Assigned applications</h2><span>Stage pendency · due date · case owner</span></div><button className="filter-pill" onClick={() => setFilter(filter ? "" : "Overdue")}>⌗ &nbsp; {filter === "Overdue" ? "Clear filter" : "All cases"}</button></div><CaseTable cases={data.cases} filter={filter} selectedId={selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
            <div className="section-title compact-title"><div><h2>Recent activity</h2><span>Stage actions and escalation history</span></div></div><div className="activity-list" id="officer-activity">{data.activity.slice(0, 4).map((a) => <div className="activity-row" key={a.id}><span className="activity-mark"><Icon name="clock" size={14}/></span><span>{a.text}</span><small>{a.time}</small></div>)}</div>
            <div className="case-action-card"><div><span className="status-tag status-red">OVERDUE</span><b>Lakeview College · Scrutiny pending 12 days</b><small>Officer Arjun Nair · due 18 Mar 2025 · escalation issued</small></div><button className="button-secondary small-button" onClick={() => openCase("AP-2025-0132", "bureau")}>Review case <Icon name="arrow" size={14}/></button></div>
          </>}
          {dashboard === "committee" && <>
            <div className="metric-row"><Metric label="Inspection queue" value={String(data.cases.filter((c) => c.evc && (c.stage.toLowerCase().includes("evc") || c.stage.toLowerCase().includes("inspection"))).length).padStart(2, "0")} note="Applications requiring EVC" icon="⌖"/><Metric label="Visits scheduled" value={String(data.cases.filter((c) => c.scheduledVisit).length).padStart(2, "0")} note="Saved inspection dates" icon="◷"/><Metric label="Reports pending" value={String(data.cases.filter((c) => c.stage.toLowerCase().includes("inspection")).length).padStart(2, "0")} note="Inspection stage" icon="!" alert/></div>
            <div className="section-title" id="committee-scrutiny-queue"><div><h2>Scrutiny queue</h2><span>Applications awaiting committee review</span></div></div>
            <CaseTable cases={data.cases.filter((c) => c.stage.toLowerCase().includes("scrutiny"))} filter={filter} selectedId={selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
            <div className="evc-alert"><span className="alert-symbol">!</span><div><b>Inspection report requires attention</b><small>Cedar Ridge Technical Campus · AP-2025-0119 · due 21 Mar 2025</small></div><button onClick={() => openCase("AP-2025-0119", "bureau")}>Open case <Icon name="arrow" size={14}/></button></div>
            <div className="section-title"><div><h2>EVC inspection queue</h2><span>Only applications requiring an external visit</span></div><span className="count-label">{data.cases.filter((c) => c.evc && (c.stage.toLowerCase().includes("evc") || c.stage.toLowerCase().includes("inspection"))).length} ACTIVE</span></div>
            <div className={`evc-queue ${tourFocus("committee")}`} id="evc-queue">{data.cases.filter((c) => c.evc && (c.stage.toLowerCase().includes("evc") || c.stage.toLowerCase().includes("inspection"))).map((c) => <div className="evc-row" key={c.id}><div className="evc-main"><b>{c.college}</b><small>{c.id} · {c.program}</small><div className="committee-line">Assigned officer · {c.officer}</div></div><div className="evc-status">{c.scheduledVisit ? <><b>{new Date(`${c.scheduledVisit}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</b><small>Visit scheduled</small></> : <small>Visit not scheduled</small>}</div><label className="schedule-control">Visit date<input type="date" min={new Date().toISOString().slice(0, 10)} value={scheduleDates[c.id] ?? c.scheduledVisit ?? ""} onChange={(event) => setScheduleDates((current) => ({ ...current, [c.id]: event.currentTarget.value }))}/></label><button className="button-secondary" disabled={busy || !(scheduleDates[c.id] ?? c.scheduledVisit)} onClick={() => mutate("schedule", { id: c.id, date: scheduleDates[c.id] ?? c.scheduledVisit })}>Save date</button><a className="evc-checklist-link" href={`/checklist?case=${encodeURIComponent(c.id)}`}>Visit checklist <Icon name="arrow" size={14}/></a></div>)}</div>
            <div className="section-title compact-title" id="visit-schedule"><div><h2>Scheduling overview</h2><span>Saved committee visits</span></div></div><div className="schedule-strip">{data.cases.filter((c) => c.scheduledVisit).map((c) => <div key={c.id}><span className="schedule-day">{new Date(`${c.scheduledVisit}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}<b>{new Date(`${c.scheduledVisit}T00:00:00`).getDate()}</b></span><span><b>{c.college}</b><small>Site inspection · {c.id} · {c.officer}</small></span><Status status="Due soon"/></div>)}{data.cases.every((c) => !c.scheduledVisit) && <div><span>No visits scheduled yet.</span></div>}</div>
          </>}
          {dashboard === "officer" && <>
            <div className="workflow-card officer-selector"><label htmlFor="officer-select"><b>Officer</b><select id="officer-select" value={officerName} onChange={(event) => setOfficerName(event.target.value)}><option>Meera Kulkarni</option><option>Arjun Nair</option><option>Devika Rao</option></select></label><span>{data.cases.filter((c) => c.officer === officerName).length} assigned applications</span></div>
            <div className="section-title" id="officer-queue"><div><h2>Applications assigned to {officerName}</h2><span>New and existing work assigned by the Regional Officer</span></div></div><CaseTable cases={data.cases.filter((c) => c.officer === officerName)} filter={filter} selectedId={selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
          </>}
          {dashboard === "authority" && <>
            <div className="metric-row"><Metric label="Authority queue" value={String(data.cases.filter((c) => c.stage.toLowerCase().includes("decision") || c.stage.toLowerCase().includes("hearing") || c.stage.toLowerCase().includes("compliance")).length).padStart(2, "0")} note="Hearing and decision stages" icon="▤"/><Metric label="SHC hearings" value={String(data.cases.filter((c) => c.stage.toLowerCase().includes("shc")).length).padStart(2, "0")} note="Case-specific review" icon="◷"/><Metric label="Decisions pending" value={String(data.cases.filter((c) => c.stage.toLowerCase().includes("decision")).length).padStart(2, "0")} note="Reserved to authorized authority" icon="!" alert/></div>
            <div className="authority-note"><span className="authority-icon">⚖</span><span><b>SHC / SAC is conditional</b><small>Only applicable cases enter a hearing stage. This demonstration shows workflow status; it does not issue statutory decisions.</small></span></div>
            <div className="section-title" id="authority-queue"><div><h2>Hearings &amp; decisions</h2><span>Cases currently at SHC/SAC or competent-authority stages</span></div></div>
            <CaseTable cases={data.cases.filter((c) => c.stage.toLowerCase().includes("hearing") || c.stage.toLowerCase().includes("decision") || c.stage.toLowerCase().includes("compliance"))} filter={filter} selectedId={selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
            {selected && (selected.stage === "Competent authority decision" || selected.stage === "Compliance monitoring") && <div className="route-options">{selected.stage === "Competent authority decision" ? <><button className="button-secondary" disabled={busy} onClick={() => mutate("decision", { id: selected.id, outcome: "approved" })}>Approve</button><button className="button-secondary" disabled={busy} onClick={() => mutate("decision", { id: selected.id, outcome: "rejected" })}>Reject</button><button className="button-secondary" disabled={busy} onClick={() => mutate("decision", { id: selected.id, outcome: "further-action" })}>Further action</button></> : <><button className="button-secondary" disabled={busy} onClick={() => mutate("compliance", { id: selected.id, outcome: "compliant" })}>Compliant · close</button><button className="button-secondary" disabled={busy} onClick={() => mutate("compliance", { id: selected.id, outcome: "overdue" })}>Overdue · escalate</button></>}</div>}
            <div className="section-title compact-title"><div><h2>Case workflow</h2><span>Review stage history before taking an authorized action.</span></div><button className="text-action" onClick={() => showDashboard("bureau")}>Open workflow <Icon name="arrow" size={14}/></button></div>
          </>}
        </section>
        <aside className="assistant-panel"><div className="assistant-heading"><div className="assistant-orb">✳</div><div><b>Workflow assistant</b><span><i/> Demo guide · suggestions only</span></div><button className="assistant-more" aria-label="Assistant information">···</button></div><div className="assistant-context">{dashboard === "institution" ? "INSTITUTION SUPPORT" : dashboard === "regional" ? "REGIONAL OVERSIGHT" : dashboard === "bureau" ? "REGULATION & ROUTING" : dashboard === "committee" ? "SCRUTINY & EVC REVIEW" : dashboard === "authority" ? "HEARINGS & DECISIONS" : "OFFICER QUEUE"}</div><div className="chat-intro"><div className="assistant-avatar">✳</div><p>{dashboard === "institution" ? "I can help you understand your application status, submitted documents and next steps." : dashboard === "regional" ? "I can summarize regional pendency, assigned cases and escalations." : dashboard === "bureau" ? "I can explain the selected route, current stage and the role responsible for the next action." : dashboard === "committee" ? "I can surface pending scrutiny, upcoming visits, reports and inspection alerts." : dashboard === "authority" ? "I can summarize cases awaiting applicable SHC/SAC hearings or a decision." : `You have ${data.cases.filter((item) => item.officer === officerName).length} applications assigned to ${officerName}.`}</p></div><div className="suggestion-label">SUGGESTED QUESTIONS <span>Click to explore</span></div><div className="suggestion-list">{suggestions[dashboard].map((text) => <button key={text} className="suggestion-card" onClick={() => chooseSuggestion(text)}>{text}<span>↗</span></button>)}</div>{reply && <div className="chat-response"><div><span className="assistant-avatar mini">✳</span><span>WORKFLOW ASSISTANT <small>Just now</small></span></div><p>{reply}</p><button className="response-action" onClick={() => dashboard === "bureau" ? document.getElementById("workflow-heading")?.scrollIntoView({ behavior: "smooth" }) : showDashboard("bureau")}>View related case <Icon name="arrow" size={13}/></button></div>}<div className="assistant-foot"><span className="lock-icon">◈</span> Fictional demo records · Not an official AICTE service</div></aside>
      </div>
      <footer className="page-footer"><span>AICTE Approval Workflow <i>·</i> Demonstration only</span><span>Fictional institutions, records &amp; simulated deadlines</span></footer>
    </main>
    {tourStep >= 0 && <div className="tour-backdrop" aria-hidden="true"/>}
    {tourStep >= 0 && <div className="tour-mobile-card"><span>PRODUCT TOUR · STEP {tourStep + 1}/5</span><b>{titles[dashboard][0]}</b><p>{["Upload an application and review your submitted documents.", "Monitor regional pendency, assigned applications and escalations.", "Review configured routes; SHC/SAC remains conditional.", "Review scrutiny work and coordinate required EVC visits.", "Review applicable hearings and decision-stage cases; the demo does not issue statutory decisions."][tourStep]}</p>{dashboard === "committee" && <a className="tour-mobile-checklist" href={`/checklist?case=${encodeURIComponent(selectedId)}&tour=evc-checklist`}>Open visit checklist <Icon name="arrow" size={14}/></a>}<button className="button-primary" onClick={advanceTour}>{tourStep === 4 ? "Finish tour" : "Continue"} <Icon name="arrow" size={14}/></button><button className="tour-card-close" onClick={() => setTourStep(-1)}>Dismiss</button></div>}
    </div>
  </div>;
}

function stageIndex(record: CaseRecord) {
  const stages = routeStages[record.route];
  const aliases: Record<string, string> = { draft: "Application submitted", "application submitted": "Application submitted", "evc scheduling": "EVC (if required)", "inspection report": "EVC (if required)", "shc hearing": "SAC / SHC (if required)", "inspection/report": "EVC (if required)", "competent authority decision": "Competent authority decision", "rejected / further action": "Competent authority decision", "further action required": "Competent authority decision", closed: "Closed / escalated", escalated: "Closed / escalated" };
  const current = record.stage === "Further action required" ? stages[3] : aliases[record.stage.toLowerCase()] ?? record.stage;
  const index = stages.indexOf(current);
  return index < 0 ? 0 : index;
}
function Metric({ label, value, note, icon, alert = false }: { label: string; value: string; note: string; icon: string; alert?: boolean }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><i className={alert ? "metric-alert" : ""}>{icon}</i></div><b className={alert ? "metric-number-alert" : ""}>{value}</b><small>{note}</small></div>;
}
function Status({ status }: { status: string }) { const tone = status === "Overdue" || status === "Rejected" ? "red" : status === "Due soon" ? "amber" : status === "Submitted" ? "blue" : "green"; return <span className={`status-tag status-${tone}`}><i/> {status}</span>; }
function CaseTable({ cases, filter, selectedId, onSelect }: { cases: CaseRecord[]; filter: string; selectedId: string; onSelect: (c: CaseRecord) => void }) {
  const rows = cases.filter((c) => `${c.id} ${c.college} ${c.stage} ${c.status} ${c.officer}`.toLowerCase().includes(filter.toLowerCase()));
  return <div className="table-wrap"><table><thead><tr><th>APPLICATION</th><th>CURRENT STAGE</th><th>ASSIGNED OFFICER</th><th>PENDENCY</th><th>STATUS</th><th/></tr></thead><tbody>{rows.map((c) => <tr key={c.id} className={selectedId === c.id ? "selected-row" : ""} onClick={() => onSelect(c)}><td><b>{c.college}</b><small>{c.id} <span>·</span> {c.type}</small></td><td><b className="stage-cell">{c.stage}</b></td><td><b>{c.officer}</b></td><td><span className={c.status === "Overdue" ? "pend-overdue" : ""}>{c.daysPending} days</span><small>Due {c.due}</small></td><td><Status status={c.status}/></td><td><button className="table-open" aria-label={`Open ${c.id}`} onClick={(e) => { e.stopPropagation(); onSelect(c); }}><Icon name="arrow" size={15}/></button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">{cases.length === 0 ? "No applications are currently assigned to this officer." : `No demo records match “${filter}”.`}</div>}</div>;
}
