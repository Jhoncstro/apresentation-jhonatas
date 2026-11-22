# Project rules

- The public portfolio is authored in this repository and deployed directly to Firebase Hosting. Do not require Lovable editor credits or a Lovable publishing step for portfolio changes.
- Preserve published Git history: no force pushes, rebases, amendments or squashes of already-pushed commits. Keep each published revision working.
- Deploy only the portfolio Hosting site `jhonatas-castro-portfolio` in Firebase project `project-c1bb5150-c01e-4305-9c7`. Do not change Nexus Hosting, database rules or production data as a side effect of portfolio updates.
- Personal portfolio pages share `PortfolioShell`. Keep `/dashboard`, the existing patient demonstration, independent so portfolio changes do not alter its workflow.
- Contact and project links live in `src/lib/portfolio-content.ts`. Use verified destinations or user-provided contacts. Contact enquiries use the verified Workana profile; project briefs are browser-local downloads. Never imply that a message was sent.
- The legacy Nexo SaaS at `/app` still uses its existing Lovable Cloud/Supabase backend and OAuth compatibility. Every data row carries `organization_id`; RLS checks membership through `is_member()`. Hosting migration does not migrate its accounts, data or authentication.
- Preserve the legacy app, database and users. Treat their migration as separate work; do not delete the old Lovable project/backend or revoke an account-wide GitHub integration to complete public-portfolio changes.
- The portfolio project's GitHub sync with Lovable was disconnected after Firebase validation on 2026-11-22. Preserve that independent workflow and other projects' integrations.
- Keep secrets out of source and public build files. Use Node >=24.12 and the NPM lockfile. Validate types, existing tests, build and static output before publishing; `npm run deploy` performs the build and static checks before Hosting publication.
