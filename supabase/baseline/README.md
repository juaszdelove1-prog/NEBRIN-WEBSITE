# NEBRIN Supabase Production Baseline

This folder documents the existing production database state for reference only.

Current production inventory captured on 2026-08-12:
- Public tables: 118
- Public views: 12
- Public functions: 149
- Recorded Supabase migrations: 22

Important safety rule:
Do NOT copy the existing production schema into `supabase/migrations/` as a new baseline migration. The production database already contains this schema. Reapplying it could create conflicts or duplicate objects.

From this point forward, only NEW reviewed database changes should be added as timestamped `.sql` files under `supabase/migrations/`.

Recent production migration history includes:
- 20260812091938 fix_finance_governance_json_aggregation
- 20260812084000 finance_governance_dashboard_v1
- 20260812083709 finance_role_aware_dashboard
- 20260812083622 finance_roles_audit_governance_v2
- 20260812070411 nebrin_one_finance_notifications_actions
- 20260812031244 create_nebrin_app_access_snapshot
- 20260811073404 staff_notification_centre
- 20260811071708 finance_case_payment_controls
- 20260811071123 unified_case_notifications_and_payment_bridge
- 20260811070214 workflow_completion_and_public_tracking_bridge
- 20260811053024 add_public_office_case_tracking
- 20260811052327 unified_customer_secretary_department_flow
- 20260811030147 secure_digital_office_functions
- 20260811030135 stabilize_digital_office_access
- 20260811022325 nebrin_one_employee_identity_rls_v1
- 20260811021857 nebrin_one_access_snapshot_hardening
- 20260810202209 fix_overtime_state_and_rls
- 20260810202029 nebrin_one_rbac_foundation
- 20260810190117 lock_down_internal_rpc_public_execute_phase2
- 20260810190029 lock_down_internal_rpc_anon_access_phase1
- 20260810183635 online_office_workflow_rpc_permissions
- 20260810183616 online_office_workflow_core
