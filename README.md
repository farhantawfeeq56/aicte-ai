# AICTE AI — Workflow Demo

An interactive, fictional demo of AICTE approval workflows with an institution portal and four role dashboards: Regional Officer, Regulation/Bureau Officer, Scrutiny/EVC Committee Member, and SHC/SAC/Decision Authority. It also includes an assigned-officer work queue.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Start product tour** to follow the guided workflow, or the **View as** switcher to jump directly between role-specific workspaces.

## Demo behavior

- All colleges, officers, application records, due dates, and notifications are fictional.
- Uploads are simulated: the API records file names and sizes, not file contents.
- Regional Officers can register applications and assign one of the demo officers; assigned cases appear in that officer's work queue.
- Committee members can save EVC visit dates for eligible cases; saved dates appear in the scheduling overview.
- Demo API state is held in memory and resets when the server restarts.
- The simulated workflow is application submission → document/data validation → APH routing → route-specific scrutiny/EVC → conditional re-scrutiny, EVC, and SAC/SHC → competent-authority outcome → undertaking/conditions and compliance monitoring, with close or escalation.
- Routes A, B, and C demonstrate Scrutiny, Scrutiny + EVC, and EVC respectively; SAC/SHC and other marked stages remain conditional.
- Approval/rejection, compliance, closure, and escalation controls are illustrative only. The demo does not perform real validation or automated APH rule evaluation, and it does not issue statutory decisions.
- The institution portal and Regional, Bureau, Committee, Authority, and Assigned Officer dashboards are illustrative views, not authenticated or permission-enforced accounts.

## Checks

```bash
npm run lint
npm run build
```
