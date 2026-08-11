# NEBRIN ONE App

Production-connected mobile foundation for NEBRIN ONLINE SERVICE COMPANY LIMITED.

## Alpha 2
- Supabase Auth email/password login
- Persistent authenticated sessions
- Backend-driven role, permission and module resolution
- Digital Office attendance: check-in, check-out and breaks
- CEO/Manager Command Centre
- Department, workflow, security and management report snapshots
- Existing website remains untouched while mobile work is isolated on `nebrin-one-app`

## Backend
Supabase project `oguukuhflamwmgrbdqfk`.

Edge Functions:
- `nebrin-app-bootstrap`
- `nebrin-digital-office`
- `nebrin-command-centre`

Only the Supabase publishable key belongs in the mobile client. Service-role secrets must never be embedded in the application.
