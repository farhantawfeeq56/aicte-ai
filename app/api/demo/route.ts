import { randomUUID } from "node:crypto";

export type CaseRecord = {
  id: string; college: string; program: string; type: string; route: "A" | "B" | "C"; stage: string; officer: string;
  submitted: string; due: string; daysPending: number; status: "On track" | "Due soon" | "Overdue" | "Submitted" | "Rejected"; evc: boolean;
  scheduledVisit?: string;
  files: { name: string; size: number; kind: string }[];
};

type DemoState = { cases: CaseRecord[]; activity: { id: string; text: string; time: string }[] };
const stateKey = "__aicteWorkflowDemo";
const runtime = globalThis as typeof globalThis & { [stateKey]?: DemoState };
const seed: DemoState = {
  cases: [
    { id: "AP-2025-0148", college: "Northfield Institute of Technology", program: "B.Tech · Computer Science", type: "Extension of approval", route: "B", stage: "EVC scheduling", officer: "Meera Kulkarni", submitted: "12 Mar 2025", due: "28 Mar 2025", daysPending: 4, status: "Due soon", evc: true, files: [{ name: "Undertaking_2025.pdf", size: 248000, kind: "Undertaking" }, { name: "Land_lease_deed.pdf", size: 1200000, kind: "Lease deed" }] },
    { id: "AP-2025-0132", college: "Lakeview College of Engineering", program: "M.Tech · Data Science", type: "New program approval", route: "A", stage: "Scrutiny", officer: "Arjun Nair", submitted: "08 Mar 2025", due: "18 Mar 2025", daysPending: 12, status: "Overdue", evc: false, files: [{ name: "Application_Form.pdf", size: 510000, kind: "Application" }] },
    { id: "AP-2025-0126", college: "Saffron Valley Polytechnic", program: "Diploma · Mechatronics", type: "Approval appeal", route: "C", stage: "SHC hearing", officer: "Devika Rao", submitted: "04 Mar 2025", due: "25 Mar 2025", daysPending: 8, status: "On track", evc: true, files: [{ name: "Appeal_submission.pdf", size: 680000, kind: "Appeal" }] },
    { id: "AP-2025-0119", college: "Cedar Ridge Technical Campus", program: "B.Arch · Architecture", type: "Intake variation", route: "B", stage: "Inspection report", officer: "Meera Kulkarni", submitted: "01 Mar 2025", due: "21 Mar 2025", daysPending: 9, status: "Overdue", evc: true, files: [{ name: "Site_plan.pdf", size: 940000, kind: "Site plan" }] },
    { id: "AP-2025-0151", college: "Meridian School of Applied Sciences", program: "B.Tech · Electronics", type: "Extension of approval", route: "A", stage: "Competent authority decision", officer: "Arjun Nair", submitted: "14 Mar 2025", due: "31 Mar 2025", daysPending: 2, status: "On track", evc: false, files: [{ name: "Compliance_pack.pdf", size: 780000, kind: "Compliance" }] },
  ],
  activity: [
    { id: "a1", text: "Northfield Institute · application assigned to Meera Kulkarni", time: "Today, 09:42" },
    { id: "a2", text: "Cedar Ridge Technical Campus · inspection report due in 2 days", time: "Today, 08:15" },
    { id: "a3", text: "Lakeview College · scrutiny task escalated (12 days pending)", time: "Yesterday, 16:20" },
  ],
};
function db() { return runtime[stateKey] ??= structuredClone(seed); }
function log(text: string) { db().activity.unshift({ id: randomUUID(), text, time: "Just now" }); }
const officers = ["Meera Kulkarni", "Arjun Nair", "Devika Rao"];
export async function GET() { return Response.json(db(), { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Request must be valid JSON." }, { status: 400 }); }
  const data = db();
  if (body.action === "create") {
    const college = String(body.college ?? "").trim();
    const program = String(body.program ?? "").trim();
    const officer = String(body.officer ?? "");
    const route = body.route;
    if (!college || college.length > 120 || !program || program.length > 120 || !officers.includes(officer) || !["A", "B", "C"].includes(String(route))) return Response.json({ error: "Enter a valid institution, program, officer, and workflow route." }, { status: 400 });
    const year = new Date().getFullYear();
    const sequence = data.cases.reduce((max, item) => Math.max(max, Number(item.id.match(/^AP-\d{4}-(\d+)$/)?.[1] ?? 0)), 0) + 1;
    const record: CaseRecord = { id: `AP-${year}-${String(sequence).padStart(4, "0")}`, college, program, type: "New program approval", route: route as CaseRecord["route"], stage: "Application submitted", officer, submitted: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), due: "Not set", daysPending: 0, status: "Submitted", evc: route !== "A", files: [] };
    data.cases.unshift(record);
    log(`${record.id} · new application submitted by ${college}; assigned to ${officer}`);
    return Response.json(data);
  }
  if (body.action === "schedule") {
    const record = data.cases.find((item) => item.id === body.id);
    const date = String(body.date ?? "");
    if (!record) return Response.json({ error: "Application not found." }, { status: 404 });
    if (!record.evc || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date < new Date().toISOString().slice(0, 10)) return Response.json({ error: "Choose a valid future date for an application requiring an EVC visit." }, { status: 400 });
    record.scheduledVisit = date;
    log(`${record.id} · EVC visit scheduled for ${date}`);
    return Response.json(data);
  }
  if (body.action === "upload") {
    const name = String(body.name ?? "").trim();
    const size = Number(body.size);
    if (!name || name.length > 180 || !Number.isFinite(size) || size < 0 || size > 15_000_000) return Response.json({ error: "Choose a named file smaller than 15 MB." }, { status: 400 });
    const isApplication = body.mode === "application";
    let record = isApplication
      ? data.cases.find((item) => item.id === "AP-2025-0152")
      : data.cases.find((item) => item.id === body.id);
    if (isApplication && !record) {
      record = { id: "AP-2025-0152", college: "Northfield Institute of Technology", program: "B.Tech · Artificial Intelligence", type: "New program approval", route: "B", stage: "Draft", officer: "Meera Kulkarni", submitted: "", due: "11 Apr 2025", daysPending: 0, status: "Submitted", evc: true, files: [] };
      data.cases.unshift(record);
    }
    if (!record) return Response.json({ error: "Application not found." }, { status: 404 });
    record.files.push({ name, size, kind: isApplication ? "Application / supporting document" : "Supporting document" });
    if (isApplication) { record.stage = "Application submitted"; record.status = "Submitted"; record.submitted = "Today · simulated"; }
    log(`${record.college} · ${name} uploaded${isApplication ? "; application submitted" : "; supporting document received"}`);
    return Response.json(data);
  }
  if (body.action === "route") {
    const record = data.cases.find((item) => item.id === body.id);
    if (!record || !["A", "B", "C"].includes(String(body.route))) return Response.json({ error: "Select a valid case and route." }, { status: 400 });
    record.route = body.route as CaseRecord["route"];
    record.evc = record.route !== "A";
    record.stage = "APH rule-engine routing";
    record.daysPending = 0; record.status = "On track";
    log(`${record.id} · route ${record.route} selected; current stage: ${record.stage}`);
    return Response.json(data);
  }
  if (body.action === "advance") {
    const record = data.cases.find((item) => item.id === body.id);
    if (!record) return Response.json({ error: "Application not found." }, { status: 404 });
    const stages = ({
      A: ["Application submitted", "Document/data validation", "APH rule-engine routing", "Scrutiny", "Re-scrutiny (if required)", "EVC (if required)", "SAC / SHC (if required)", "Competent authority decision"],
      B: ["Application submitted", "Document/data validation", "APH rule-engine routing", "Scrutiny + EVC", "Re-scrutiny (if required)", "EVC (if required)", "SAC / SHC (if required)", "Competent authority decision"],
      C: ["Application submitted", "Document/data validation", "APH rule-engine routing", "EVC", "Re-scrutiny (if required)", "EVC (if required)", "SAC / SHC (if required)", "Competent authority decision"],
    })[record.route];
    const current = record.stage.toLowerCase();
    const aliases: Record<string, string> = { draft: "Application submitted", "application submitted": "Application submitted", "evc scheduling": "EVC (if required)", "inspection report": "EVC (if required)", "shc hearing": "SAC / SHC (if required)" };
    if (current === "undertaking / conditions") record.stage = "Compliance monitoring";
    else if (body.stage === "Scrutiny" && current === "further action required") record.stage = record.route === "A" ? "Scrutiny" : record.route === "B" ? "Scrutiny + EVC" : "EVC";
    else {
      const currentStage = aliases[current] ?? record.stage;
      const index = stages.indexOf(currentStage);
      if (index < 0 || index === stages.length - 1) return Response.json({ error: "This case is not at an advanceable workflow stage." }, { status: 409 });
      if (body.skip === true && !currentStage.includes("if required")) return Response.json({ error: "Only a conditional stage can be skipped." }, { status: 409 });
      record.stage = stages[index + 1];
    }
    record.daysPending = 0; record.status = "On track";
    log(`${record.id} · ${body.skip === true ? "conditional stage skipped; moved to" : "moved to"} ${record.stage}`);
    return Response.json(data);
  }
  if (body.action === "decision") {
    const record = data.cases.find((item) => item.id === body.id);
    if (!record) return Response.json({ error: "Application not found." }, { status: 404 });
    if (record.stage !== "Competent authority decision" || !["approved", "rejected", "further-action"].includes(String(body.outcome))) return Response.json({ error: "Record an outcome only at the competent-authority stage." }, { status: 409 });
    record.stage = body.outcome === "approved" ? "Undertaking / conditions" : body.outcome === "rejected" ? "Rejected / further action" : "Further action required";
    if (body.outcome === "rejected") record.status = "Rejected";
    log(`${record.id} · demo decision outcome: ${String(body.outcome)}`);
    return Response.json(data);
  }
  if (body.action === "compliance") {
    const record = data.cases.find((item) => item.id === body.id);
    if (!record) return Response.json({ error: "Application not found." }, { status: 404 });
    if (record.stage !== "Compliance monitoring" || !["compliant", "overdue"].includes(String(body.outcome))) return Response.json({ error: "Compliance can be recorded only during monitoring." }, { status: 409 });
    record.stage = body.outcome === "compliant" ? "Closed" : "Escalated";
    record.status = body.outcome === "overdue" ? "Overdue" : "On track";
    log(`${record.id} · compliance ${String(body.outcome)}; ${record.stage.toLowerCase()}`);
    return Response.json(data);
  }
  if (body.action === "refresh") return Response.json(data);
  return Response.json({ error: "Unknown demo action." }, { status: 400 });
}
