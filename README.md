# Accredit.flow — AICTE Workflow Demo

An interactive, fictional demo of AICTE approval workflows across four role dashboards: Regional Officer, Regulation/Bureau Officer, Scrutiny/EVC Committee Member, and SHC/SAC/Decision Authority.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Start product tour** to follow the guided workflow, or the **View as** switcher to jump directly between role-specific workspaces.

## Demo behavior

- All colleges, officers, application records, due dates, and notifications are fictional.
- Uploads are simulated: the API records file names and sizes, not file contents.
- Demo API state is held in memory and resets when the server restarts.
- Route C demonstrates conditional SHC/SAC handling; it is not a mandatory stage for every application.
- Regional, Bureau, Committee, and Authority dashboards are illustrative role views, not authenticated or permission-enforced accounts.
- The demo does not issue statutory decisions. Those remain with the competent authority.

## Checks

```bash
npm run lint
npm run build
```
