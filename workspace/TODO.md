<instructions>
This file powers chat suggestion chips. Keep it focused and actionable.
</instructions>

<todo id="lead-inbox" status="done">
✅ Live Lead Inbox — DONE
Omnichannel inbox with live filters (source, service, urgency, status, search), color-coded SourceBadge per channel, 1-click WhatsApp/Call/Email actions, HOT urgency marker, relative timestamps, StageSelector dropdown with useMutation stage transitions, full LiveKanban with Dental+Hair column sets, and LeadInboxDetail panel with quick-task creation.
</todo>

<todo id="pipeline-kanban">
Build Full Dental + Hair Kanban Pipelines
Full 20-stage Dental pipeline and 19-stage Hair pipeline already defined in DENTAL_STAGES / HAIR_STAGES constants. Upgrade LiveKanban to show ALL stages (not just 8 key cols), add drag-and-drop, and persist stage changes with audit log entry on each transition.
</todo>

<todo id="patient-profile-360" status="done">
✅ Patient Profile 360 — DONE
Full tabbed profile: Overview (identity, contact, source history, open tasks, recent payments), Timeline (chronological journey from lead capture → conversion → quotes → payments → travel), Tasks (full CRUD via useMutation, overdue highlighting), Quotes (history with service images and status badges), Payments (ledger table + financial summary row with outstanding balance), Travel (coordinator checklist + TravelRecord fields), Media (photo/doc grid with file type detection), Consent (checklist with status badges). Linked from Patients list. Hero panel with financial snapshot + allergies/critical notes inline edit.
</todo>

<todo id="quote-builder" status="done">
✅ Quote / Treatment Plan Builder — DONE
Full builder with Dental (implants, crown type/count, veneer count) and Hair (graft range min/max, FUE/DHI/Sapphire/Unshaven technique) fields. Multi-currency EUR/GBP/USD/ALL with live conversion. Package inclusions checklist (hotel, transfer, PRP, etc.). Live price summary with discount %, deposit %, validity days. Version history per patient. useQuery('Quote') + useMutation('Quote') wired.
</todo>

<todo id="task-sla-engine">
Build Task + SLA Engine
Every lead must have owner, next action, due date. Overdue tasks in red. Auto-create tasks on stage change. Use useQuery('Task') filtered by relatedEntityId with priority ordering.
</todo>

<todo id="travel-module" status="done">
✅ Travel Coordination Module — DONE
TravelModule with KPI row, add travel record form, upcoming/past sections, TravelRecordCard, coordinator checklist with progress bar, pending pickups sidebar with 1-click confirm. useQuery('TravelRecord') + useMutation('TravelRecord').
</todo>

<todo id="payment-tracker" status="done">
✅ Payment & Deposit Tracker — DONE
Transaction ledger with type/method/refund filters. KPI row (total collected, deposits, pending deposits, refunds). Per-patient deposit status panel with progress bar + outstanding balance. Inline NewPaymentForm (amount, currency, type, method, date, refund status, notes). Revenue breakdown bar chart by payment type. useQuery(&#39;Payment&#39;) + useMutation(&#39;Payment&#39;). Payments nav item wired across top nav, left sidebar, and mobile bottom nav.
</todo>

<todo id="doctor-review-queue">
Build Doctor Review Workflow
Photo upload completeness check → doctor review queue → structured assessment → treatment plan approval → quote generation trigger. Media via useQuery('MediaFile').
</todo>

<todo id="reports-dashboard" status="done">
✅ Live Reports Dashboard — DONE
All metrics live from SDK. Date range filter (all/30d/7d). 8 KPI cards. Overview (leads by service, 6-month revenue trend, patient status, quote pipeline). Funnel (6-stage with drop-off %, rate cards). Revenue (by service, by method, monthly table). Sources (leads by source, deposit rate per source, HOT urgency per source). Agents (per-agent table: leads/deposits/lost/rate, pipeline health).
</todo>

<todo id="auth-roles" status="done">
✅ Auth + Role-Based Access — DONE
useAuth() wired with full login screen (dark branded UI). 7 roles: Admin, Owner, Sales, Coordinator, Doctor, Finance, ReadOnly. resolveUserRole() maps email → role. Sidebar nav filtered by role.modules array. Payments module gated to Finance/Admin/Owner. Settings gated to Admin/Owner. Reports revenue KPIs hidden from non-finance roles (shows "Restricted"). AccessDenied screen for unauthorized module access. FinanceField wrapper component for field-level restriction. Role matrix table rendered in Settings. Mobile sheet nav also role-filtered with sign-out button.
</todo>
