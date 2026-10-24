"use client";

import Link from "next/link";
import "./checklist.css";
import { startTransition, useEffect, useMemo, useState } from "react";

type CheckItem = { id: string; label: string; detail?: string };
type CheckSection = { title: string; description: string; items: CheckItem[] };
const sections: CheckSection[] = [
  { title: "Before the visit", description: "Confirm the visit is ready to proceed.", items: [
    { id: "committee", label: "Committee members and identification verified" },
    { id: "institution-contact", label: "Institution representative is present" },
    { id: "scope", label: "Visit scope and programme details confirmed" },
    { id: "documents", label: "Application and submitted documents available for reference" },
  ] },
  { title: "Campus & infrastructure", description: "Record what was physically observed during the visit.", items: [
    { id: "land", label: "Land, access and campus boundaries reviewed" },
    { id: "buildings", label: "Academic and administrative buildings inspected" },
    { id: "classrooms", label: "Classrooms and instructional spaces observed" },
    { id: "laboratories", label: "Laboratories, equipment and workshops reviewed" },
    { id: "library", label: "Library, learning resources and reading space reviewed" },
    { id: "safety", label: "Fire safety, accessibility and basic safety provisions observed" },
  ] },
  { title: "People & academic facilities", description: "Verify availability and note evidence reviewed.", items: [
    { id: "faculty", label: "Faculty details and availability checked" },
    { id: "staff", label: "Technical and supporting staff details checked" },
    { id: "students", label: "Student facilities and support services reviewed" },
    { id: "records", label: "Relevant registers and original records cross-checked" },
  ] },
  { title: "Close-out", description: "Complete the visit record before leaving the institution.", items: [
    { id: "observations", label: "Observations and any discrepancies recorded" },
    { id: "evidence", label: "Supporting evidence referenced in the visit notes" },
    { id: "discussion", label: "Key observations discussed with the institution representative" },
    { id: "review", label: "Visit notes reviewed by the committee before sign-off" },
  ] },
];
const caseDetails: Record<string, { institution: string; programme: string }> = {
  "AP-2025-0148": { institution: "Northfield Institute of Technology", programme: "Engineering programmes" },
  "AP-2025-0119": { institution: "Cedar Ridge Technical Campus", programme: "Technical programmes" },
};

export default function ChecklistPage() {
  const [caseId, setCaseId] = useState("AP-2025-0148");
  const [checked, setChecked] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [returnToTour, setReturnToTour] = useState(false);
  const [furtherReview, setFurtherReview] = useState<"undecided" | "not-required" | "sac" | "shc">("undecided");
  const allItems = useMemo(() => sections.flatMap((section) => section.items), []);
  const detail = caseDetails[caseId] ?? { institution: "EVC inspection visit", programme: "Programme under inspection" };
  const progress = Math.round((checked.length / allItems.length) * 100);
  const evcHref = returnToTour ? "/?workspace=evc&tour=evc-checklist" : "/?workspace=evc";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("case");
    if (id) startTransition(() => setCaseId(id));
    if (params.get("tour") === "evc-checklist") startTransition(() => setReturnToTour(true));
  }, []);
  useEffect(() => {
    const key = `evc-visit-checklist:${caseId}`;
    try {
      const savedVisit = localStorage.getItem(key);
      if (savedVisit) {
        const visit = JSON.parse(savedVisit) as { checked?: string[]; notes?: string; visitDate?: string; furtherReview?: string };
        startTransition(() => {
          setChecked(Array.isArray(visit.checked) ? visit.checked.filter((id) => allItems.some((item) => item.id === id)) : []);
          setNotes(typeof visit.notes === "string" ? visit.notes : "");
          setVisitDate(typeof visit.visitDate === "string" ? visit.visitDate : "");
          setFurtherReview(visit.furtherReview === "not-required" || visit.furtherReview === "sac" || visit.furtherReview === "shc" ? visit.furtherReview : "undecided");
          setSaved(false);
        });
      } else startTransition(() => { setChecked([]); setNotes(""); setVisitDate(""); setFurtherReview("undecided"); setSaved(false); });
    } catch { startTransition(() => { setChecked([]); setNotes(""); setVisitDate(""); setFurtherReview("undecided"); setSaved(false); }); }
  }, [caseId, allItems]);

  function save() {
    if (furtherReview === "undecided") return;
    try {
      localStorage.setItem(`evc-visit-checklist:${caseId}`, JSON.stringify({ checked, notes, visitDate, furtherReview }));
      setSaved(true);
    } catch { setSaved(false); }
  }
  function toggle(id: string) {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setSaved(false);
  }

  return <main className="visit-page">
    <header className="visit-topbar"><Link className="visit-brand" href={evcHref}><span className="visit-brand-mark">F</span><span>Field<span className="visit-brand-light">.visit</span><small>EVC FIELD WORKSPACE</small></span></Link><Link className="visit-back" href={evcHref}>← <span>Back to inspection queue</span></Link></header>
    <div className="visit-content">
      <div className="visit-breadcrumb"><Link href={evcHref}>EVC inspections</Link><span>/</span><span>Visit checklist</span></div>
      <section className="visit-heading"><div><div className="visit-kicker"><i/> FIELD VISIT · CHECKLIST</div><h1>Site inspection</h1><p>Use this checklist during the EVC visit. Record observations as you go.</p></div><div className="visit-case"><span>APPLICATION</span><b>{caseId}</b><small>{detail.programme}</small></div></section>
      <section className="visit-summary" aria-label="Visit details"><div className="visit-institution"><span className="visit-institution-mark">{detail.institution.charAt(0)}</span><div><small>INSTITUTION</small><b>{detail.institution}</b></div></div><label className="visit-date"><span>VISIT DATE</span><input type="date" value={visitDate} onChange={(event) => { setVisitDate(event.target.value); setSaved(false); }}/></label><div className="visit-progress"><div><span>Checklist progress</span><b>{checked.length} <small>/ {allItems.length}</small></b></div><div className="visit-progress-track"><i style={{ width: `${progress}%` }}/></div></div></section>
      <div className="visit-layout"><div className="visit-sections">{sections.map((section, index) => {
        const completed = section.items.filter((item) => checked.includes(item.id)).length;
        return <section className="visit-section" key={section.title}><div className="visit-section-heading"><div><span className="visit-section-index">{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2><p>{section.description}</p></div></div><span className="visit-section-count">{completed}/{section.items.length}</span></div><div className="visit-items">{section.items.map((item) => <label className={`visit-item ${checked.includes(item.id) ? "is-checked" : ""}`} key={item.id}><input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)}/><span className="visit-checkmark" aria-hidden="true"/><span className="visit-item-label">{item.label}{item.detail && <small>{item.detail}</small>}</span></label>)}</div></section>;
      })}
      <section className="visit-decision"><div className="visit-decision-heading"><span className="visit-section-index">05</span><div><h2>SAC / SHC follow-up</h2><p>Record whether this visit indicates a further review is needed.</p></div></div><fieldset><legend>Is SAC or SHC required for this case?</legend><div className="visit-decision-options"><label className={furtherReview === "not-required" ? "selected" : ""}><input type="radio" name="further-review" checked={furtherReview === "not-required"} onChange={() => { setFurtherReview("not-required"); setSaved(false); }}/>No further review</label><label className={furtherReview === "sac" ? "selected" : ""}><input type="radio" name="further-review" checked={furtherReview === "sac"} onChange={() => { setFurtherReview("sac"); setSaved(false); }}/>SAC</label><label className={furtherReview === "shc" ? "selected" : ""}><input type="radio" name="further-review" checked={furtherReview === "shc"} onChange={() => { setFurtherReview("shc"); setSaved(false); }}/>SHC</label></div></fieldset><div className={`visit-decision-result ${furtherReview === "undecided" ? "pending" : ""}`} role="status"><b>{furtherReview === "undecided" ? "Decision not recorded" : furtherReview === "not-required" ? "No SAC / SHC follow-up recorded" : `${furtherReview.toUpperCase()} follow-up recorded`}</b><span>{furtherReview === "undecided" ? "Select the outcome after reviewing the findings." : "This records the committee’s recommendation for the authorized officer to review."}</span></div><p className="visit-decision-note">SAC / SHC applicability is case-specific. The checklist records the committee’s recommendation; the authorized officer confirms the applicable process.</p></section>
      <label className="visit-notes"><span>Visit observations <small>Note findings, discrepancies or follow-up required.</small></span><textarea value={notes} onChange={(event) => { setNotes(event.target.value); setSaved(false); }} placeholder="Record observations during the visit…" rows={5}/></label>
      </div><aside className="visit-aside"><div className="visit-aside-title"><span className="visit-aside-icon">✓</span><div><b>On-site record</b><small>Checklist for the visiting committee</small></div></div><p>Mark each item after it has been reviewed. Add specific observations before saving the visit record on this device.</p><div className="visit-aside-stat"><span>Items reviewed</span><b>{checked.length} <small>of {allItems.length}</small></b></div><div className="visit-aside-stat"><span>Visit date</span><b>{visitDate ? new Date(`${visitDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not set"}</b></div><button className="visit-save" onClick={save} disabled={furtherReview === "undecided"}>Save checklist <span>↓</span></button><small className="visit-save-note">{furtherReview === "undecided" ? "Record the SAC / SHC outcome to save" : "Saved on this device"}</small>{saved && <div className="visit-saved" role="status">✓ Checklist saved on this device</div>}<div className="visit-demo-note">Working record only. This demo does not submit an official inspection report.</div></aside></div>
    </div>
    <div className="visit-mobile-save"><span>{checked.length}/{allItems.length} reviewed</span><button onClick={save} disabled={furtherReview === "undecided"}>Save checklist</button>{saved && <small role="status">Saved</small>}</div>
  </main>;
}
