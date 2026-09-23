# Formulario-Mamparas — cutover status

This repository is the legacy source for general incidents and vehicle/mampara inspections.

Its functional scope has been migrated to `MiguelParedesR/Dashboard-Seguridad` on branch `modernization/next-platform`:
- General incidents: `/incidencias`
- Mamparas / vehicle inspections: `/mamparas`
- Evidence uploads: server-side Next Route Handlers
- Reports: `/reportes`

## Retirement rule
Do not disable the current public entrypoint until the Next production URL is active, the TPP Supabase RLS cutover has been applied, and role smoke tests pass. At that point this repository should become read-only/archive material and its public entrypoint should redirect to the new platform.

No new operational functionality should be added here after the cutover.
