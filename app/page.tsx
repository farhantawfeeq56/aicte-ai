"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { CaseRecord } from "./api/demo/route";

type Dashboard = "institution" | "routing" | "officer" | "evc" | "compliance";
type State = { cases: CaseRecord[]; activity: { id: string; text: string; time: string }[] };
const workspaces: Record<Dashboard, { label: string; category: string; identity: string; role: string; initials: string; mark: string }> = {
  institution: { label: "Institution portal", category: "COLLEGE ACCOUNT", identity: "Northfield Institute", role: "Institution administrator", initials: "NI", mark: "N" },
  routing: { label: "Workflow routing", category: "PROCESS OPERATIONS", identity: "Workflow operations", role: "Routing overview", initials: "WO", mark: "⇢" },
  officer: { label: "Officer workspace", category: "OFFICER CONSOLE", identity: "Meera Kulkarni", role: "Scrutiny officer", initials: "MK", mark: "M" },
  evc: { label: "EVC inspections", category: "FIELD OPERATIONS", identity: "Dr. Pranav Shah", role: "EVC coordinator", initials: "PS", mark: "E" },
  compliance: { label: "Compliance office", category: "COMPLIANCE OFFICE", identity: "Ritu Deshmukh", role: "Compliance officer", initials: "RD", mark: "C" },
};
const sideLinks: Record<Dashboard, { label: string; icon: string; anchor: string }[]> = {
  institution: [{ label: "Overview", icon: "▦", anchor: "page-top" }, { label: "Applications", icon: "▤", anchor: "application-list" }, { label: "Documents", icon: "▧", anchor: "document-list" }, { label: "Programs & profile", icon: "◫", anchor: "page-top" }],
  routing: [{ label: "Case overview", icon: "▦", anchor: "page-top" }, { label: "Route configuration", icon: "⇢", anchor: "workflow-heading" }, { label: "Stage history", icon: "☷", anchor: "stage-flow" }],
  officer: [{ label: "My assigned queue", icon: "▤", anchor: "assigned-queue" }, { label: "Workload", icon: "▥", anchor: "officer-workload" }, { label: "Activity & escalations", icon: "◷", anchor: "officer-activity" }],
  evc: [{ label: "Inspection queue", icon: "⌖", anchor: "evc-queue" }, { label: "Visit schedule", icon: "▦", anchor: "visit-schedule" }, { label: "Reports & alerts", icon: "!", anchor: "page-top" }],
  compliance: [{ label: "Obligations", icon: "◷", anchor: "obligations" }, { label: "Document register", icon: "▧", anchor: "obligations" }, { label: "Verification", icon: "✓", anchor: "compliance-verification" }],
};
const tour: Dashboard[] = ["institution", "routing", "officer", "evc", "compliance"];
const titles: Record<Dashboard, [string, string]> = {
  institution: ["Institution dashboard", "Manage applications, documents and approval status."],
  routing: ["Application routing", "A configurable workflow. The competent authority retains every statutory decision."],
  officer: ["Officer workspace", "Assigned cases, stage-level pendency and next actions."],
  evc: ["EVC inspections", "Coordinate committee assignments, visits and inspection reports."],
  compliance: ["Compliance overview", "Track undertakings, document validity and renewal obligations."],
};
const suggestions: Record<Dashboard, string[]> = {
  institution: ["What is the status of my application?", "Which documents have I uploaded?", "What should I do next?"],
  routing: ["Explain this application’s route", "Who owns the current stage?", "What happens after this stage?"],
  officer: ["Show pending scrutiny", "Which applications are overdue?", "How is workload distributed?", "Where are the bottlenecks?", "Which cases need action today?"],
  evc: ["Show upcoming visits", "Which cases need scheduling?", "Are any reports pending?", "Show delayed inspections", "What alerts need attention?"],
  compliance: ["Show upcoming deadlines", "Which documents are expiring?", "What submissions are pending?", "Show overdue compliance", "What is the verification status?"],
};
const routeStages: Record<CaseRecord["route"], string[]> = {
  A: ["Application", "Scrutiny / re-scrutiny", "Competent-authority decision"],
  B: ["Application", "Scrutiny / re-scrutiny", "EVC scheduling", "Inspection / report", "Competent-authority decision"],
  C: ["Application", "Scrutiny", "Conditional SAC appeal or SHC hearing", "Prescribed next action"],
};
const complianceRows = [
  { college: "Northfield Institute of Technology", item: "Land lease deed", due: "30 Apr 2025", state: "Expires in 42 days", tone: "amber", caseId: "AP-2025-0148" },
  { college: "Cedar Ridge Technical Campus", item: "Fire safety undertaking", due: "19 Mar 2025", state: "Overdue · 3 days", tone: "red", caseId: "AP-2025-0119" },
  { college: "Lakeview College of Engineering", item: "Building stability certificate", due: "02 Apr 2025", state: "Verification pending", tone: "blue", caseId: "AP-2025-0132" },
  { college: "Saffron Valley Polytechnic", item: "Mandatory disclosure", due: "27 Mar 2025", state: "Submission due soon", tone: "amber", caseId: "AP-2025-0126" },
];

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
  const [activeSection, setActiveSection] = useState("Overview");
  const [tourStep, setTourStep] = useState(-1);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [filter, setFilter] = useState("");
  const [routeChoice, setRouteChoice] = useState<CaseRecord["route"]>("B");
  const selected = data?.cases.find((item) => item.id === selectedId) ?? data?.cases[0];

  const refresh = useCallback(async () => {
    const response = await fetch("/api/demo", { cache: "no-store" });
    if (!response.ok) throw new Error("Demo service is unavailable. Refresh to reconnect.");
    setData(await response.json() as State);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("workspace") === "evc") startTransition(() => setDashboard("evc"));
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
      setData(result); setFlash(action === "upload" ? extra.mode === "supporting" ? "Supporting document added to the selected application" : "Application submitted with supporting documents" : action === "route" ? "Workflow route updated" : "Application stage updated");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not complete this action."); return false; }
    finally { setBusy(false); }
  }
  async function upload(file?: File, mode: "application" | "supporting" = "application") {
    if (!file) return;
    const success = await mutate("upload", { name: file.name, size: file.size, mode, id: selectedId });
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
      institution: `Application ${c?.id} for ${c?.college} is ${c?.status.toLowerCase()} at “${c?.stage}”. ${c?.files.length ?? 0} supporting documents are on file. ${c?.status === "Submitted" ? "Your next step is to monitor the scrutiny stage." : "Upload the application and supporting documents to submit."}`,
      routing: `Route ${c?.route} is selected for ${c?.college}. Current stage: ${c?.stage}. Responsible role: ${c?.stage.includes("EVC") || c?.stage.includes("Inspection") ? "EVC coordinator / inspection committee" : c?.stage.includes("decision") ? "Competent authority" : "Assigned scrutiny officer"}. The next action is ${c?.stage === "EVC scheduling" ? "confirm a visit date and committee" : c?.stage.includes("Inspection") ? "submit the signed inspection report" : "complete scrutiny and record observations"}. SAC/SHC is conditional and is not part of every route. No statutory decision is made by this demo.` ,
      officer: `There are ${data?.cases.filter((x) => x.stage.toLowerCase().includes("scrutiny")).length ?? 0} scrutiny-stage cases in the fictional queue. ${data?.cases.filter((x) => x.status === "Overdue").length ?? 0} applications are overdue; Lakeview has been pending 12 days and Cedar Ridge’s report is 3 days overdue. Assigned officers: Meera Kulkarni (2), Arjun Nair (2), Devika Rao (1). Prioritize overdue scrutiny, then record a stage action.` ,
      evc: `The demo EVC queue has 2 cases: Northfield is awaiting visit scheduling (target 28 Mar 2025); Cedar Ridge is awaiting its inspection report (due 21 Mar 2025). Assign a committee, confirm visit dates and submit reports. Cedar Ridge is delayed and requires an escalation reminder.` ,
      compliance: `Four fictional obligations are tracked. Cedar Ridge’s fire safety undertaking is overdue by 3 days. Northfield’s lease deed expires 30 Apr 2025. Lakeview’s building stability certificate awaits verification. Open a record below to review its related application and next action.` ,
    };
    setReply(`${text}\n\n${responses[dashboard]}`);
  };
  const notifications = useMemo(() => [
    { title: "Inspection report overdue", detail: "Cedar Ridge · AP-2025-0119 · 3 days", caseId: "AP-2025-0119", tone: "red" },
    { title: "Scrutiny task escalated", detail: "Lakeview College · AP-2025-0132 · 12 days", caseId: "AP-2025-0132", tone: "red" },
    { title: "EVC visit to schedule", detail: "Northfield Institute · due 28 Mar", caseId: "AP-2025-0148", tone: "amber" },
    { title: "Lease deed renewal reminder", detail: "Northfield Institute · 42 days remaining", caseId: "AP-2025-0148", tone: "blue" },
    { title: "Compliance undertaking overdue", detail: "Cedar Ridge · AP-2025-0119 · 3 days", caseId: "AP-2025-0119", tone: "red" },
  ], []);
  const unread = notifications.length;
  if (!data) return <div className="loading-screen"><div className="brand-mark">A</div><p>Connecting to the fictional demo workspace…</p>{error && <button onClick={() => refresh().catch((e: Error) => setError(e.message))}>Retry connection</button>}</div>;

  return <div className={`app-shell role-${dashboard}`}>
    <aside className={`sidebar sidebar-${dashboard}`}>
      <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); showDashboard("institution"); }}><span className="brand-mark">{workspaces[dashboard].mark}</span><span>{dashboard === "institution" ? <>Northfield<span className="brand-light">.edu</span></> : dashboard === "routing" ? <>AICTE<span className="brand-light">.flow</span></> : dashboard === "officer" ? <>Officer<span className="brand-light">.desk</span></> : dashboard === "evc" ? <>Field<span className="brand-light">.visit</span></> : <>Compliance<span className="brand-light">.desk</span></>}<small>{workspaces[dashboard].category}</small></span></a>
      <div className="workspace-label">{dashboard === "institution" ? "YOUR INSTITUTION" : dashboard === "routing" ? "CASE WORKFLOW" : dashboard === "officer" ? "MY WORKSPACE" : dashboard === "evc" ? "FIELD PROGRAM" : "RECORDS & REVIEW"}</div>
      <nav className="main-nav" aria-label={`${workspaces[dashboard].label} navigation`}>{sideLinks[dashboard].map((item, index) => <a key={item.label} href={`#${item.anchor}`} className={`nav-item ${activeSection === item.label ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveSection(item.label); document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span className="nav-icon">{item.icon}</span>{item.label}{dashboard === "officer" && index === 0 && <span className="nav-count">2</span>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="demo-flag"><span className="pulse-dot"/> Demo workspace <span>FICTIONAL</span></div><button className="replay-link" onClick={startTour}>↗ &nbsp; Replay product tour</button><div className="profile"><div className="avatar">{workspaces[dashboard].initials}</div><div><b>{workspaces[dashboard].identity}</b><small>{workspaces[dashboard].role}</small></div><span className="profile-menu">···</span></div></div>
    </aside>
    <div className="workspace">
      <header className={`topbar topbar-${dashboard}`}><div className="breadcrumbs"><span>{workspaces[dashboard].label}</span><span className="crumb-sep">/</span><b>{titles[dashboard][0]}</b><span className="env-pill">FICTIONAL DATA</span></div><div className="top-actions"><div className="workspace-switcher"><button className="switcher-button" aria-haspopup="listbox" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen(!switcherOpen)}><span>VIEW AS</span><b>{workspaces[dashboard].label}</b><i>⌄</i></button>{switcherOpen && <div className="switcher-menu" role="listbox" aria-label="Switch demo workspace">{(Object.keys(workspaces) as Dashboard[]).map((key) => <button key={key} role="option" aria-selected={key === dashboard} className={key === dashboard ? "selected-workspace" : ""} onClick={() => selectWorkspace(key)}><span className={`switcher-icon icon-${key}`}>{workspaces[key].mark}</span><span><b>{workspaces[key].label}</b><small>{workspaces[key].role}</small></span>{key === dashboard && <i>✓</i>}</button>)}</div>}</div><label className="search-box"><Icon name="search" size={16}/><input aria-label="Search demo records" placeholder="Search applications…" value={filter} onChange={(e) => setFilter(e.target.value)}/><kbd>⌘ K</kbd></label><button className={`icon-button bell-button ${notificationOpen ? "pressed" : ""}`} aria-label={`Notifications (${unread} reminders)`} onClick={() => setNotificationOpen(!notificationOpen)}><Icon name="bell"/><i>{unread}</i></button><div className="header-divider"/><button className="help-button" onClick={startTour}>? <span>Tour</span></button></div>
        {notificationOpen && <div className="notification-popover"><div className="popover-title"><div><b>Notifications</b><small>{unread} reminders · fictional demo</small></div><button className="icon-button small-close" aria-label="Close notifications" onClick={() => setNotificationOpen(false)}><Icon name="close" size={16}/></button></div>{notifications.map((n) => <button key={n.title} className="notification-item" onClick={() => openCase(n.caseId, n.title.includes("Lease") || n.title.includes("Compliance") ? "compliance" : n.title.includes("Inspection") || n.title.includes("EVC") ? "evc" : "officer")}><span className={`notice-dot ${n.tone}`}/><span><b>{n.title}</b><small>{n.detail}</small></span><Icon name="arrow" size={15}/></button>)}<div className="popover-foot">Reminders and escalations reflect the demo case records.</div></div>}
      </header>
      <main className="page-content" id="page-top">
        <div className="page-heading"><div><div className="heading-meta"><span className="status-dot green"/> AICTE approval workflow <span className="meta-sep">·</span> Last synced just now</div><h1>{titles[dashboard][0]}</h1><p>{titles[dashboard][1]}</p></div><div className="heading-buttons"><button className="button-secondary" onClick={startTour}><span>▷</span> Start product tour</button>{dashboard === "institution" && <label className="button-primary upload-cta"><Icon name="upload" size={16}/> Upload application<input type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg" onChange={(e) => upload(e.target.files?.[0])}/></label>}</div></div>
        {(tourStep >= 0 || error || flash) && <div className={`message-banner ${error ? "error-banner" : tourStep >= 0 ? "tour-banner" : "success-banner"}`}>
          {error ? <><b>Action needs attention</b><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16}/></button></> : tourStep >= 0 ? <><span className="tour-step-count">0{tourStep + 1} <i>/ 05</i></span><div><b>{["Start with your institution workspace", "Choose a route that fits the case", "See officer pendency and workload", "Coordinate EVC inspection tasks", "Keep compliance obligations visible"][tourStep]}</b><span>{["Upload the fictional application and review its documents.", "Route variants are configurable; SAC/SHC is conditional.", "Overdue cases and stage ownership are visible to officers.", "Only applications that require EVC appear in this queue.", "Deadlines and verification status connect to the same demo records."][tourStep]}</span></div><button className="tour-next" onClick={advanceTour}>{tourStep === 4 ? "Finish tour" : "Next dashboard"} <Icon name="arrow" size={14}/></button><button className="tour-dismiss" onClick={() => setTourStep(-1)}>Dismiss</button></> : <><Icon name="check" size={16}/><span>{flash}</span><button onClick={() => setFlash("")} aria-label="Dismiss message"><Icon name="close" size={16}/></button></>}
        </div>}
        <div className="content-grid"><section className="primary-column">
          {dashboard === "institution" && <>
            <div className="metric-row"><Metric label="Active applications" value={String(data.cases.length).padStart(2, "0")} note="Across fictional institutions" icon="▤"/><Metric label="Action required" value="02" note="1 document · 1 response" icon="!" alert/><Metric label="Approval validity" value="2025–26" note="Renewal window opens soon" icon="◷"/></div>
            <div className="section-title" id="application-list"><div><h2>Applications</h2><span>Applications submitted by your institution</span></div><button className="text-action" onClick={() => showDashboard("routing")}>View workflow <Icon name="arrow" size={14}/></button></div>
            <CaseTable cases={data.cases.slice(0, 3)} filter={filter} selectedId={selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
            <div className="section-title compact-title"><div><h2>Supporting documents</h2><span>Northfield Institute · AP-2025-0148</span></div><label className="text-action document-upload"><Icon name="upload" size={15}/> Add document<input type="file" onChange={(e) => upload(e.target.files?.[0], "supporting")}/></label></div>
            <div className={`document-list ${tourFocus("institution")}`} id="document-list">{selected?.files.map((file) => <div className="document-row" key={file.name}><div className="file-icon"><Icon name="file" size={17}/></div><div className="document-name"><b>{file.name}</b><small>{file.kind} · {(file.size / 1000000).toFixed(1)} MB</small></div><span className="status-tag status-green"><Icon name="check" size={12}/> Received</span><button className="more-button" aria-label={`More options for ${file.name}`}>···</button></div>)}{!selected?.files.length && <div className="empty-state">No supporting documents yet. Upload a file to add one.</div>}</div>
          </>}
          {dashboard === "routing" && selected && <>
            <div className="route-case-strip"><div className="institution-avatar">{selected.college.charAt(0)}</div><div><b>{selected.college}</b><small>{selected.id} <span>·</span> {selected.type}</small></div><Status status={selected.status}/></div>
            <div className="workflow-card" id="workflow-heading"><div className="workflow-heading"><div><h2>Configure workflow</h2><p>Select a route for this application. The prescribed process remains case-specific.</p></div><span className="config-label">CONFIGURABLE</span></div><div className="route-options">{(["A", "B", "C"] as const).map((r) => <button key={r} className={`route-option ${routeChoice === r ? "chosen" : ""}`} onClick={() => setRouteChoice(r)}><span className="route-radio"/><span><b>Route {r}</b><small>{r === "A" ? "Standard scrutiny" : r === "B" ? "EVC inspection required" : "Conditional appeal / hearing"}</small></span><span className="route-option-end">{r === selected.route ? "CURRENT" : ""}</span></button>)}</div><button disabled={busy || routeChoice === selected.route} className="button-primary save-route" onClick={() => mutate("route", { id: selected.id, route: routeChoice })}>Apply route <Icon name="arrow" size={15}/></button></div>
            <div className="section-title"><div><h2>Selected workflow · Route {selected.route}</h2><span>Current position and responsible next action</span></div><span className="live-pill"><i/> LIVE STATUS</span></div>
            <div className={`stage-flow ${tourFocus("routing")}`} id="stage-flow">{routeStages[selected.route].map((stage, i) => <div className={`stage-item ${i === stageIndex(selected) ? "current" : i < stageIndex(selected) ? "complete" : ""}`} key={stage}><div className="stage-connector"/><div className="stage-node">{i === 0 ? <Icon name="check" size={14}/> : String(i + 1).padStart(2, "0")}</div><div className="stage-detail"><b>{stage}</b><small>{i === 0 ? "Submitted · 12 Mar 2025" : i === routeStages[selected.route].length - 1 ? "Decision reserved to competent authority" : i === 2 && selected.route === "B" ? "EVC coordinator · schedule visit" : i === 2 && selected.route === "C" ? "Only if appeal / hearing is applicable" : "Assigned role · action pending"}</small>{i === 2 && selected.route === "C" && <span className="conditional-chip">CONDITIONAL, NOT UNIVERSAL</span>}</div>{i === 0 ? <span className="stage-state">DONE</span> : i === stageIndex(selected) ? <span className="stage-state active-state">CURRENT</span> : null}</div>)}</div>
            <div className="authority-note"><span className="authority-icon">⚖</span><span><b>Decision integrity</b><small>Workflow tools support administration. Statutory decisions remain exclusively with the competent authority.</small></span></div>
            <button className="button-secondary advance-button" disabled={busy} onClick={() => mutate("advance", { id: selected.id })}>Simulate next stage <Icon name="arrow" size={15}/></button>
          </>}
          {dashboard === "officer" && <>
            <div className="metric-row"><Metric label="Assigned cases" value={String(data.cases.filter((c) => c.officer !== "Unassigned").length).padStart(2, "0")} note="Across 3 processing stages" icon="▤"/><Metric label="Overdue" value="02" note="Escalation reminder sent" icon="!" alert/><Metric label="Due this week" value="03" note="Next deadline · 19 Mar" icon="◷"/></div>
            <div className={`workload-band ${tourFocus("officer")}`} id="officer-workload"><div className="workload-label"><span>OFFICER WORKLOAD</span><b>Assigned cases by officer</b></div>{["Meera Kulkarni", "Arjun Nair", "Devika Rao"].map((name) => { const n = data.cases.filter((c) => c.officer === name).length; return <div className="workload-person" key={name}><span>{name}</span><div className="workload-track"><i style={{ width: `${Math.min(n * 24, 100)}%` }}/></div><b>{n}</b></div>; })}</div>
            <div className="section-title" id="assigned-queue"><div><h2>Assigned applications</h2><span>Stage pendency · due date · case owner</span></div><button className="filter-pill" onClick={() => setFilter(filter ? "" : "Overdue")}>⌗ &nbsp; {filter === "Overdue" ? "Clear filter" : "All cases"}</button></div><CaseTable cases={data.cases} filter={filter} selectedId={selectedId} onSelect={(c) => { setSelectedId(c.id); setRouteChoice(c.route); }}/>
            <div className="section-title compact-title"><div><h2>Recent activity</h2><span>Stage actions and escalation history</span></div></div><div className="activity-list" id="officer-activity">{data.activity.slice(0, 4).map((a) => <div className="activity-row" key={a.id}><span className="activity-mark"><Icon name="clock" size={14}/></span><span>{a.text}</span><small>{a.time}</small></div>)}</div>
            <div className="case-action-card"><div><span className="status-tag status-red">OVERDUE</span><b>Lakeview College · Scrutiny pending 12 days</b><small>Officer Arjun Nair · due 18 Mar 2025 · escalation issued</small></div><button className="button-secondary small-button" onClick={() => openCase("AP-2025-0132", "routing")}>Review case <Icon name="arrow" size={14}/></button></div>
          </>}
          {dashboard === "evc" && <>
            <div className="metric-row"><Metric label="Inspection queue" value="02" note="2 committees assigned" icon="⌖"/><Metric label="Visits this week" value="01" note="Next · 24 Mar 2025" icon="◷"/><Metric label="Reports pending" value="01" note="Cedar Ridge · overdue" icon="!" alert/></div>
            <div className="evc-alert"><span className="alert-symbol">!</span><div><b>Inspection report requires attention</b><small>Cedar Ridge Technical Campus · AP-2025-0119 · due 21 Mar 2025</small></div><button onClick={() => openCase("AP-2025-0119", "routing")}>Open case <Icon name="arrow" size={14}/></button></div>
            <div className="section-title"><div><h2>EVC inspection queue</h2><span>Only applications requiring an external visit</span></div><span className="count-label">2 ACTIVE</span></div>
            <div className={`evc-queue ${tourFocus("evc")}`} id="evc-queue">{data.cases.filter((c) => c.evc && (c.stage.toLowerCase().includes("evc") || c.stage.toLowerCase().includes("inspection"))).map((c) => <div className="evc-row" key={c.id}><div className="calendar-date"><b>{c.id.endsWith("148") ? "28" : "21"}</b><small>MAR</small></div><div className="evc-main"><b>{c.college}</b><small>{c.id} · {c.program}</small><div className="committee-line"><span className="avatar-stack"><i>MK</i><i>PN</i></span> {c.id.endsWith("148") ? "Committee assigned · visit to schedule" : "Committee · report due"}</div></div><div className="evc-status"><Status status={c.id.endsWith("119") ? "Overdue" : "Due soon"}/><small>{c.id.endsWith("119") ? "Report pending" : "Visit · 24 Mar 2025"}</small></div><a className="evc-checklist-link" href={`/checklist?case=${encodeURIComponent(c.id)}`}>Visit checklist <Icon name="arrow" size={14}/></a><button className="table-open" aria-label={`Open ${c.id}`} onClick={() => openCase(c.id, "routing")}><Icon name="arrow" size={15}/></button></div>)}</div>
            <div className="section-title compact-title" id="visit-schedule"><div><h2>Scheduling overview</h2><span>Committee capacity and upcoming visits</span></div></div><div className="schedule-strip"><div><span className="schedule-day">MON <b>24</b></span><span><b>Northfield Institute</b><small>Site inspection · Committee A</small></span><Status status="Due soon"/></div><div><span className="schedule-day muted-day">WED <b>26</b></span><span><b>No visit scheduled</b><small>1 open committee slot</small></span><button className="text-action" onClick={() => setFlash("Choose an available date in the scheduling workspace")}>Schedule <Icon name="arrow" size={13}/></button></div></div>
          </>}
          {dashboard === "compliance" && <>
            <div className="metric-row"><Metric label="Tracked obligations" value="08" note="Across 4 fictional colleges" icon="▤"/><Metric label="Expiring soon" value="02" note="Within the next 60 days" icon="◷" alert/><Metric label="Verification pending" value="01" note="Lakeview · document review" icon="!"/></div>
            <div className="compliance-summary"><span className="summary-check"><Icon name="check" size={16}/></span><div><b>Compliance tracking is up to date</b><small>Last demo sync · just now · deadlines are illustrative only</small></div><span className="summary-date">4 obligations need follow-up</span></div>
            <div className="section-title"><div><h2>Obligations &amp; renewals</h2><span>Undertakings, validity and submission verification</span></div><button className="filter-pill" onClick={() => setFilter(filter ? "" : "Overdue")}>⌗ &nbsp; All obligations</button></div>
            <div className={`table-wrap compliance-table ${tourFocus("compliance")}`} id="obligations"><table><thead><tr><th>INSTITUTION / DOCUMENT</th><th>DEADLINE</th><th>STATUS</th><th>CASE</th><th/></tr></thead><tbody>{complianceRows.filter((r) => !filter || r.state.includes(filter)).map((r) => <tr key={r.item} onClick={() => openCase(r.caseId, "routing")}><td><b>{r.item}</b><small>{r.college}</small></td><td>{r.due}<small>Simulated deadline</small></td><td><span className={`status-tag status-${r.tone}`}>{r.state}</span></td><td className="case-link">{r.caseId}</td><td><button className="table-open" aria-label={`Open ${r.caseId}`}><Icon name="arrow" size={15}/></button></td></tr>)}</tbody></table></div>
            <div className="section-title compact-title"><div><h2>Verification &amp; renewal</h2><span>What happens next</span></div></div><div className="verification-cards" id="compliance-verification"><div><span className="verification-icon blue-icon">⌕</span><span><b>Lakeview · certificate review</b><small>Assigned to compliance officer · verify file authenticity</small></span><span className="status-tag status-blue">IN REVIEW</span></div><div><span className="verification-icon amber-icon">◷</span><span><b>Northfield · lease renewal</b><small>Reminder due 30 days before expiry · 30 Mar 2025</small></span><span className="status-tag status-amber">UPCOMING</span></div></div>
          </>}
        </section>
        <aside className="assistant-panel"><div className="assistant-heading"><div className="assistant-orb">✳</div><div><b>Workflow assistant</b><span><i/> Demo guide · suggestions only</span></div><button className="assistant-more" aria-label="Assistant information">···</button></div><div className="assistant-context">{dashboard === "institution" ? "INSTITUTION SUPPORT" : dashboard === "routing" ? "ROUTE EXPLAINER" : dashboard === "officer" ? "OFFICER INSIGHTS" : dashboard === "evc" ? "EVC COORDINATION" : "COMPLIANCE GUIDE"}</div><div className="chat-intro"><div className="assistant-avatar">✳</div><p>{dashboard === "institution" ? "Hello, Ananya. I can help you understand your application status, document checklist and next steps." : dashboard === "routing" ? "I can explain the selected route, current stage and the role responsible for the next action." : dashboard === "officer" ? "Ask me to surface pending work, overdue cases or workload patterns from the demo queue." : dashboard === "evc" ? "I can summarize visits, scheduling gaps, pending reports and inspection alerts." : "I can help identify approaching deadlines, expiring documents and verification actions."}</p></div><div className="suggestion-label">SUGGESTED QUESTIONS <span>Click to explore</span></div><div className="suggestion-list">{suggestions[dashboard].map((text) => <button key={text} className="suggestion-card" onClick={() => chooseSuggestion(text)}>{text}<span>↗</span></button>)}</div>{reply && <div className="chat-response"><div><span className="assistant-avatar mini">✳</span><span>WORKFLOW ASSISTANT <small>Just now</small></span></div><p>{reply}</p><button className="response-action" onClick={() => dashboard === "routing" ? document.getElementById("workflow-heading")?.scrollIntoView({ behavior: "smooth" }) : showDashboard("routing")}>View related case <Icon name="arrow" size={13}/></button></div>}<div className="assistant-foot"><span className="lock-icon">◈</span> Fictional demo records · Not an official AICTE service</div></aside>
      </div>
      <footer className="page-footer"><span>AICTE Approval Workflow <i>·</i> Demonstration only</span><span>Fictional institutions, records &amp; simulated deadlines</span></footer>
    </main>
    {tourStep >= 0 && <div className="tour-backdrop" aria-hidden="true"/>}
    {tourStep >= 0 && <div className="tour-mobile-card"><span>PRODUCT TOUR · STEP {tourStep + 1}/5</span><b>{titles[dashboard][0]}</b><p>{["Your institution workspace: upload a fictional application and review documents.", "Route applications by case. SAC/SHC is conditional.", "Officer work shows stage pendency and overdue cases.", "EVC dashboard tracks required inspections only.", "Compliance deadlines connect to the same demo cases."][tourStep]}</p><button className="button-primary" onClick={advanceTour}>{tourStep === 4 ? "Finish tour" : "Continue"} <Icon name="arrow" size={14}/></button><button className="tour-card-close" onClick={() => setTourStep(-1)}>Dismiss</button></div>}
    <input id="application-upload" className="visually-hidden" type="file" onChange={(e) => upload(e.target.files?.[0])}/>
    </div>
  </div>;
}

function stageIndex(record: CaseRecord) {
  const stage = record.stage.toLowerCase();
  if (stage.includes("submitted")) return 0;
  if (stage.includes("scrutiny")) return 1;
  if (record.route === "A") return stage.includes("decision") ? 2 : 1;
  if (record.route === "B") return stage.includes("evc") ? 2 : stage.includes("inspection") || stage.includes("report") ? 3 : stage.includes("decision") ? 4 : 1;
  return stage.includes("appeal") || stage.includes("hearing") ? 2 : stage.includes("prescribed") ? 3 : 1;
}
function Metric({ label, value, note, icon, alert = false }: { label: string; value: string; note: string; icon: string; alert?: boolean }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><i className={alert ? "metric-alert" : ""}>{icon}</i></div><b className={alert ? "metric-number-alert" : ""}>{value}</b><small>{note}</small></div>;
}
function Status({ status }: { status: string }) { const tone = status === "Overdue" ? "red" : status === "Due soon" ? "amber" : status === "Submitted" ? "blue" : "green"; return <span className={`status-tag status-${tone}`}><i/> {status}</span>; }
function CaseTable({ cases, filter, selectedId, onSelect }: { cases: CaseRecord[]; filter: string; selectedId: string; onSelect: (c: CaseRecord) => void }) {
  const rows = cases.filter((c) => `${c.id} ${c.college} ${c.stage} ${c.status} ${c.officer}`.toLowerCase().includes(filter.toLowerCase()));
  return <div className="table-wrap"><table><thead><tr><th>APPLICATION</th><th>CURRENT STAGE</th><th>PENDENCY</th><th>STATUS</th><th/></tr></thead><tbody>{rows.map((c) => <tr key={c.id} className={selectedId === c.id ? "selected-row" : ""} onClick={() => onSelect(c)}><td><b>{c.college}</b><small>{c.id} <span>·</span> {c.type}</small></td><td><b className="stage-cell">{c.stage}</b><small>Officer · {c.officer}</small></td><td><span className={c.status === "Overdue" ? "pend-overdue" : ""}>{c.daysPending} days</span><small>Due {c.due}</small></td><td><Status status={c.status}/></td><td><button className="table-open" aria-label={`Open ${c.id}`} onClick={(e) => { e.stopPropagation(); onSelect(c); }}><Icon name="arrow" size={15}/></button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">No demo records match “{filter}”. <button onClick={() => onSelect(cases[0])}>Clear selection</button></div>}</div>;
}
