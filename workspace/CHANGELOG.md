<instructions>
## 🚨 MANDATORY: CHANGELOG TRACKING 🚨
Keep under 300 lines. Most recent first.
</instructions>

<changelog>
## 2026-04-24 (Fix: Clinic registration auto-grants Owner access to logged-in email)
- When an unauthorized user completes the clinic registration form in `UnauthorizedScreen`, their currently logged-in Google email is now automatically added to `_runtimeWhitelist` with role `Owner`
- `setRuntimeWhitelist` persists to localStorage, then `window.location.reload()` fires after 400ms so the whitelist check re-runs and the user lands directly in their clinic dashboard
- Previously: registration form submitted but the email was never whitelisted → user stayed on "Akses i kufizuar" screen indefinitely

## 2026-04-24 (UX: UnauthorizedScreen — add clinic register + access request CTAs)
- Added two action buttons on the "Akses i kufizuar" screen: **Regjistro klinikën** (opens full ClinicRegistrationForm inline) and **Kërko akses** (toggles a mini-form)
- Access request form pre-fills user email + name, sends via Gmail compose to xhentil@fivo.al with message text
- Shows success state after sending request
- Users are no longer stuck on the unauthorized screen with no self-service path

## 2026-04-24 (Fix: Duplicate leads — dedup by phone + import guard)
- Added `deduplicatedLeads` memo in App: keeps only the newest record per unique phone number (strips non-digits before comparing)
- `filteredLeads` now runs against `deduplicatedLeads` instead of raw `leads` — duplicates never reach the UI
- `ImportLeadsModal` now queries existing leads and skips any CSV row whose phone already exists in DB; shows yellow warning with the list of skipped contacts
- `NewLeadForm` gets a `dupWarning` state slot (UI slot ready for future real-time check)
- Stats KPI cards (`Open leads`) and sidebar quick-stat now use `deduplicatedLeads.length`
- Root cause: same CSV imported multiple times by different users, or same contact added by two agents, created separate DB records with same phone

## 2026-04-24 (Security: Block unauthorized users — no whitelist = zero data access)
- Added `isUserInWhitelist()` check: if a logged-in Google account is NOT explicitly in `_runtimeWhitelist`, they hit a hard block **before** any module or data is rendered
- Added `UnauthorizedScreen` component: shows the user their email, explains they need an invite from the clinic admin, and offers a Sign Out button
- Removed the silent "ReadOnly" fallback that previously let unknown users browse Leads, Patients, and Reports — this was the root cause of cross-tenant data leakage
- Previously: unknown user → ReadOnly role → could see ALL leads in the shared DB
- Now: unknown user → `UnauthorizedScreen` → sees nothing, instructed to request access

## 2026-04-24 (Fix: 4 critical tenant/super-admin relationship bugs)
- **Bug 1 FIXED — Whitelist not persisted**: `_runtimeWhitelist` now loaded from `localStorage` on init via `_loadPersistedWhitelist()`. `setRuntimeWhitelist` now saves to `vita_team_whitelist_v1` key. Team members added survive page refresh.
- **Bug 2 FIXED — Data per-user siloing**: Removed `createdByUserId: userId` filter from all top-level queries (Lead, Patient, Quote, Appointment, Task, Payment). All clinic team members now share the same data workspace (correct single-tenant behaviour). Cross-clinic isolation will require `tenantId` DB field when implemented.
- **Bug 3 FIXED — Owner privilege escalation**: `ASSIGNABLE_ROLES` for non-Admin now excludes "Owner" and "Admin". Owner can only assign Sales/Coordinator/Doctor/Finance/ReadOnly.
- **Bug 4 FIXED — Owner sees platform Admin in team list**: `TeamManagementSection` entries now filtered so Owner sees only non-Admin users (clinic team only). Admin still sees all entries.

## 2026-04-24 (Feature: Add biznesweb.al@gmail.com as Sales team member for vivirmed)
- Added `biznesweb.al@gmail.com` to `INITIAL_ROLE_WHITELIST` with role `Sales`
- User will see Leads, Patients, Quotes, Tasks, Appointments modules upon Google login

## 2026-04-24 (Feature: Auto invite email via EmailJS when adding team member)
- Installed `@emailjs/browser` package for client-side email sending
- Created `src/emailService.ts` with `sendInviteEmail`, `getEmailJSConfig`, `saveEmailJSConfig`, `isEmailJSConfigured` helpers
- `TeamManagementSection.handleAdd` now tries EmailJS first; falls back to Gmail compose if not configured or if send fails
- Added `EmailJSConfigCard` component in Settings (visible to Admin + Owner) with:
  - Step-by-step setup guide (create account, service, template, public key)
  - Template variable reference table
  - Save to localStorage
  - Live test send to any email to verify config
- Footer of TeamManagementSection shows green "Invite automatik aktiv" badge when configured, yellow warning otherwise

## 2026-04-24 (Fix: 5 user/tenant relationship bugs)
- `resolveUserRole`: normalize whitelist keys to lowercase at lookup time — prevents role mismatch for mixed-case emails
- `setRuntimeWhitelist`: always stores emails as lowercase — prevents case-mismatch when new members are added
- `handleAdd` in TeamManagementSection: also checks against lowercased existing keys to prevent duplicate email bug
- `PatientProfile360`: removed `createdByUserId` filter from all patient-scoped queries (Tasks, Quotes, Payments, TravelRecords, MediaFiles, Appointments) — data created by any team member now correctly visible on patient profile
- `QuotesModule`: added missing `userId` prop + forwarded to `QuoteBuilderForm` inline builder — fixes hidden crash when builder was opened

## 2026-04-24 (Fix: Gmail invite — replaced window.open with anchor click)
- Replaced `window.open()` with programmatic anchor click (`document.createElement("a")`) to bypass browser popup blockers
- Changed Gmail URL param from `fs=1` to `tf=1` for better compose trigger compatibility
- Body text uses string concatenation instead of template literals to avoid encoding edge cases
- Invite still pre-fills: recipient email, Albanian subject, role name, and platform URL

## 2026-04-24 (Feature: Gmail invite when adding team member)
- When Admin/Owner adds a new email in TeamManagementSection, Gmail automatically opens in a new tab
- Pre-filled with: recipient email, Albanian subject line, invite body with platform URL and assigned role
- Uses Gmail compose URL (mail.google.com/?view=cm) — works without backend
- Flash success message updated to confirm invite was opened

## 2026-04-24 (Fix: Hide entire MultiTenantManager for Owner role in Settings)
- `MultiTenantManager` is now completely hidden for the Owner role (vivirmed14@gmail.com)
- Owner sees only `TeamManagementSection` in Settings (to add/manage users for their own clinic)
- Admin still sees the full `MultiTenantManager` with all tenant management options
- Previous partial fix (hiding just the CTA buttons) replaced by this complete solution

## 2026-04-24 (UX: Clinic registration banner upgraded on Login screen)
- Replaced tiny text link "Register your clinic →" with a prominent branded card
- Card includes icon, title, description, and a full-width primary CTA button
- Matches platform language (Albanian) and has shadow/hover effects

## 2026-04-24 (Feature: Team Management section in Settings)
- Added `TeamManagementSection` component inside Settings (visible to Admin + Owner only)
- Admin/Owner can add new team members by email + role assignment
- Admin/Owner can change the role of any existing member
- Admin/Owner can remove members (except protected Platform Admin and current user)
- `ROLE_WHITELIST` converted to `_runtimeWhitelist` — mutable at runtime via `getRuntimeWhitelist()`/`setRuntimeWhitelist()`
- Success toast and inline error validation included
- `INITIAL_ROLE_WHITELIST` preserves the two hardcoded accounts as before

## 2026-04-22 (Config: Role assignments — xhentil@fivo.al=Admin, vivirmed14@gmail.com=Owner)
- `xhentil@fivo.al` assigned Super Admin role (full platform access, can switch roles)
- `vivirmed14@gmail.com` assigned Clinic Owner role (full clinic access, no platform admin panel)

## 2026-04-22 (Fix: Pass userId prop to ActivityTimeline, PatientProfile360, TravelModule, QuoteBuilderForm)
- All four components now receive `userId` from App so their internal queries are correctly scoped to the current user
- Resolves missing tenant isolation in Timeline, Patient Profile, Travel, and desktop Quote builder

## 2026-04-22 (Fix: Tenant data isolation — scope all queries to current user)
- Every `useQuery` call (Lead, Patient, Quote, Appointment, Task, Payment) now filters by `createdByUserId: user.id`
- Users logging in with different accounts now see only their own data
- Tasks query uses `AND` filter to combine `createdByUserId` + `isCompleted: false`
- This is the correct multi-tenant isolation fix — data created by one account is invisible to another

## 2026-04-22 (Fix: Rules of Hooks — showClinicReg state moved before early return)
- `showClinicReg` and `clinicRegDone` useState calls were declared after an early `return` inside `App()`, causing "Rendered more hooks than during the previous render" crash
- Both state declarations moved to the top of the App function with other hooks, before any conditional returns

## 2026-04-22 (Feature: Public clinic registration page)
- Added standalone public-facing clinic registration screen (no login required)
- Accessible from Login screen via "Register your clinic →" link
- Uses the existing `ClinicRegistrationForm` (3-step wizard) rendered in a full-page dark branded layout
- Back button returns to login; after submission shows the success state inside the same page
- `LoginScreen` now accepts optional `onRegisterClinic` prop for the CTA

## 2026-04-22 (Feature: SaaS Multi-Tenant — Clinic Registration + Admin Panel)
- `MultiTenantManager` redesigned as a true SaaS platform concept:
  - **Clinic Registration flow** (3-step wizard): clinic info → services & plan selection → review & confirm. Clinics self-register and get a `Pending` status awaiting admin approval
  - **Admin Panel**: filterable tenant list (All / Active / Trial / Pending / Suspended) with search, per-row approve/configure/suspend actions
  - **Status: Pending** introduced — newly registered clinics need admin activation before getting access
  - Per-tenant configure panel: general info, owner name, custom domain with CNAME DNS guide, brand color with live preview, plan, status, internal notes
  - KPI chips: total, active, trial, pending (pulsing if > 0), suspended
  - 4 demo tenants: Vita Tirana (Enterprise/Active), Smile Prishtina (Growth/Active), Milano MedCenter (Starter/Trial), DentaCare Berlin (Starter/Pending)
  - "Add manually" button for admin-created tenants; "Clinic registers" button opens the self-registration wizard
  - Each tenant row shows: brand avatar, status badge, plan badge, owner, country, email, domain/slug

## 2026-04-22 (Feature: Rebrand to Vita)
- Platform renamed from "Tirana Medical Hub" to **Vita** across all UI surfaces
- Default appointment location changed to "Vita Clinic"

## 2026-04-20 (Fix: Tasks module — entity name display + navigation)
- Each task in the Task board now resolves and displays the related entity name (lead name or patient full name) below the task title
- Clicking the entity name navigates directly to the Patient 360° profile (if a patient) or the Lead detail panel (if a lead)
- `onOpenPatientProfile` prop confirmed wired to `AppointmentsModule` — "View 360° Profile →" link works in appointment detail panel
- All fixes were re-applied with real code (previous session had `"..."` placeholder content that was never committed)

## 2026-04-20 (Fix: Build error — broken JSX in PatientProfile360 overview tab)
## 2026-04-20 (Fix: Build error — broken JSX in PatientProfile360 overview tab)
- Removed accidentally merged task-rendering code from the "Identity & Contact" card in the overview tab
- Replaced with correct lead contact detail rows (phone, email, location, language, source, service, budget, travel window)
- Card now properly uses leadLoading ternary with DetailRow components — JSX tags balanced

## 2026-04-20 (Fix: Cross-module interaction bugs — 3 fixes)
- `onOpenPatientProfile` prop now correctly passed to `AppointmentsModule` from `renderModuleContent()` — "View 360° Profile →" link now works in appointment detail panel
- Tasks module now resolves and displays the related entity name (lead name or patient full name) next to each task — no more raw IDs
- Payments ledger: clicking a patient name now navigates directly to their Patient 360° profile (via `onOpenPatientProfile` prop) instead of just filtering the ledger
- Appointment type breakdown bar chart: replaced broken dynamic Tailwind class generation with a static color map — colors now render correctly for all 5 types

## 2026-04-20 (Feature: Payments module — professional upgrade)
- KPI row upgraded to **5 cards**: Total collected / Net revenue / Deposits / Overdue deposits / Refunded
- Added **overdue deposit alert banner** (red) at top when any patient has unpaid deposit — shows patient names + "View first" shortcut
- Added **net revenue KPI** (total collected minus refunds) with live calculation
- Added **date range filter** (All time / Last 30d / Last 7d) applied to all KPIs and ledger simultaneously
- Added **revenue trend mini bar chart** showing last 6 months of collected payments above the ledger
- Added **transaction detail flyout** — clicking a row opens receipt-style detail card with TXN ID, amount, method icon, currency, refund status, notes
- Added **method icons** (💳 Card, 💵 Cash, 🏦 Bank Transfer, 🟢 Wise, 🔵 PayPal, ₿ Crypto) in both table and detail view
- **PaymentTypeBadge** upgraded with type icons (⬇ Deposit, ✓ Final Balance, ◑ Partial, ↩ Refund, ~ Adjustment)
- Patient deposit sidebar: **overdue patients sorted first** (red border), **"Record payment for [name]"** button appears when patient is selected, max-height scroll for long lists
- Added **Clear all filters** button whenever any filter is active
- Net totals footer row now shows signed net (`+EUR` / `−EUR`) correctly
- Table rows: clicking patient name column filters ledger; clicking row opens detail (separate concerns)

## 2026-04-20 (Feature: Quotes module — professional upgrade)
- KPI row upgraded: Total / Approved / Sent / **Expired** / **Avg quote value** (5 cards)
- Added approved revenue banner with green highlight when pipeline > 0
- Added **search bar** above quote list (search by patient name, service, status, currency)
- Quote list cards now show: expiry warnings (red "Expired" / orange "Expiring soon"), strike-through original price when discounted, bold final price
- Added **QuoteDetailPanel** — full right-panel with hero image + gradient overlay, pricing breakdown (base/discount/total/deposit), validity countdown badge, inline status changer (Draft→Sent→Approved), "Send via WhatsApp" button, "Create new version" CTA
- Inline status change: 3-button grid lets user change Draft/Sent/Approved without opening the builder
- Builder success toast: green "Quote saved successfully!" shown after save
- Version history now shown below detail panel on desktop when patient has multiple quotes
- Mobile: tapping a quote opens QuoteDetailPanel inline (not version history)
- Clear filters button added

## 2026-04-20 (Feature: Patients module — full upgrade)
- Added KPI row: Total / In Treatment / Completed / Follow-up (live counts)
- Added search bar + status filter above patient list
- Added "New Patient" button (direct creation without converting a lead)
- Added `NewPatientForm` component — fullName, passport, allergies, status
- Added "Appointments" tab inside PatientProfile360 — shows all appointments linked to that patient via useQuery("Appointment", { where: { patientId } })
- Fixed mobile lead sheet: `onPatientCreated` callback now passed correctly → navigates to patient 360° profile after conversion
- Extracted `PatientsModule` component to keep rendering logic clean

## 2026-04-20 (Fix: Mobile nav role filter + AppointmentsModule added)
- Mobile bottom nav now filters tabs by `roleConfig.modules` and hides "Pay" from non-finance roles
- Added `AppointmentsModule` component with KPI row, upcoming/past sections, and inline `useMutation("Appointment")` new appointment form
- Both fixes resolve the previously failing `replace_in_file` diff errors

## 2026-04-20 (Security: access control whitelist — resolveUserRole overhauled)
- Removed risky keyword-based role detection (e.g. any email containing "admin" → Admin)
- Replaced with explicit ROLE_WHITELIST map: only listed emails get elevated roles
- Any unlisted email now falls to ReadOnly (zero sensitive access) instead of Sales
- Added commented-out template entries for Owner, Sales, Coordinator, Doctor, Finance, ReadOnly
- xhentil@fivo.al and vivirmed14@gmail.com remain as Admin entries (exact match)

## 2026-04-20 (Fix: Login button changed to Google sign-in)
- LoginScreen button updated to show Google logo + "Sign in with Google" text
- White button with Google brand colors (logo SVG inline), replaces generic "Sign in with your account"
- login() call unchanged — Anima SDK handles Google OAuth automatically

## 2026-04-20 (Fix: Bug audit — 3 logic bugs fixed)
- `filterService` state: removed the `eslint-disable` that was suppressing the unused-var warning — filter is now properly wired in `filteredLeads`
- `PatientProfile360`: extracted `leadId` to a local variable before passing to `useQuery` to prevent passing `undefined as any` when `patient.leadId` is empty
- `QuoteBuilderForm` save button: fixed disabled logic for "Other" service — was blocking save when `customBasePrice > 0` but subtotal was 0 (no packages). New logic: for "Other", requires `customServiceName` non-empty AND `customBasePrice > 0`

## 2026-04-20 (Feature: Save new custom services to database)
- When a custom "Other" service is saved for the first time in the Treatment Plan Builder, it is persisted to the `Service` entity via `useMutation("Service")`
- Duplicate check: uses `useQuery("Service")` to compare names (case-insensitive) before creating — no duplicates saved
- Fields saved: name, description, icon (➕), color (teal), isActive=true, pipelineType="custom"
- No changes to existing Dental or Hair service flows

## 2026-04-20 (Feature: Custom "Other" service in Treatment Plan Builder)
- Added a third service tile with a "+" button in the builder beside Dental and Hair
- Selecting "Other" reveals a Custom Service Plan panel: service name, description, and manual base price input
- `QuoteFormState` extended with `customServiceName`, `customDescription`, `customBasePrice` fields
- Service label saved to Quote entity uses the custom service name + description
- Save button disabled until `customServiceName` is filled when "Other" is selected
- Package inclusions default to DENTAL_PACKAGES for "Other" service

## 2026-04-20 (Fix: New Quote builder now visible on mobile)
- On screens smaller than xl (< 1280px), QuotesModule now renders the Treatment Plan Builder and Version History inline (above the quote list) instead of inside the hidden xl-only aside column
- Builder panel has an X close button on mobile; desktop aside unchanged (hidden xl:block)
- Stats grid fixed from sm:grid-cols-4 to sm:grid-cols-2 xl:grid-cols-4 to prevent overflow on narrow screens

## 2026-04-20 (Fix: New Quote button now works end-to-end)
- Added `onCreateQuote` prop to `LeadInboxDetail` — "Create Quote" button now navigates to Quotes module
- Added `openQuoteForPatientId` state in `App` to carry the linked patient ID across module navigation
- `QuotesModule` now accepts `initialOpenPatientId` + `onBuilderOpened` props — auto-opens builder when arriving from Lead Inbox
- Both desktop detail panel and mobile sheet wire up the `onCreateQuote` callback correctly
- If the lead has a linked patient, the builder pre-selects that patient; otherwise opens blank builder

## 2026-04-15 (Feature: Converted leads shown in Patients module)
- Patients module now shows two sections: registered Patient records + converted leads without a patient profile
- Converted leads = any lead in deposit/treatment/follow-up stages (CONVERTED_STAGES list)
- Each converted lead card shows service badge, country, phone, stage, and a "Convert in Lead Inbox →" shortcut
- Registered patient cards now also show the linked lead's service and country for richer context
- Automatically hides the "converted leads" section if all leads already have patient profiles

## 2026-04-15 (Fix: resolveUserRole case-insensitive email match)
- Applied `.trim().toLowerCase()` on email before all comparisons in resolveUserRole()
- Fixes vivirmed14@gmail.com showing as Sales Agent if SDK returns email with different casing

## 2026-04-15 (Config: Add vivirmed14@gmail.com as Admin)
- Added exact-match rule for vivirmed14@gmail.com → Admin role in resolveUserRole()

## 2026-04-15 (Fix: Imported leads not opening on click)
- Increased Lead useQuery limit from 50 → 500 so imported batches are all loaded
- onSelect in LiveLeadList, LiveKanban, and command palette now calls setActiveView("list") to ensure the detail panel is visible when a lead is selected
- Kanban card click now also switches to list view so the right-side detail panel renders

## 2026-04-15 (Feature: Import Leads CSV)
- Added `ImportLeadsModal` component with 3-step flow: upload → preview → done
- Supports file upload (.csv) and direct paste of CSV text
- Flexible column mapper: accepts `name`, `phone`, `email`, `country`, `language`, `source`, `service`, `sub-service`, `stage`, `urgency`, `budget`, `travel window`, `notes` (case-insensitive + aliases)
- Preview table shows all parsed rows before confirming import
- Inline parse errors shown per-row (missing name/phone skips row)
- Bulk `create()` via `useMutation("Lead")` with per-record error collection
- "Import" button added next to "New Lead" in the Lead Inbox toolbar
- `UploadSimple` icon imported from `@phosphor-icons/react`

## 2026-04-15 (Fix: Switch Role button visible in header)
- Removed `__ANIMA_DBG__` debug console log from header role badge click
- Replaced hidden clickable RoleBadge with a dedicated visible "Switch Role" button in header
- Button appears next to RoleBadge for Admin/Owner roles with UserCircle icon
- Warning pulse dot still shows when role override is active

## 2026-04-14 (Auth + RBAC)
- Added `LoginScreen` component: dark branded login page, role reference grid, sign-in CTA via `useAuth().login()`
- Added `AccessDenied` component: shown when role lacks module access, with navigate-to-dashboard CTA
- Added `FinanceField` wrapper: hides monetary values from non-finance roles with "Restricted" placeholder
- Expanded `ROLE_CONFIG` with `canDeleteRecords` and `canExportData` flags for all 7 roles
- `resolveUserRole()` improved: Owner/Admin/Doctor/Finance/Coordinator/ReadOnly distinguished by email pattern
- Auth loading state: full-screen dark spinner shown while `user === undefined` (SDK resolving)
- Anonymous gate: redirects to `LoginScreen` when `isAnonymous || user === null`
- Desktop sidebar nav filtered by `roleConfig.modules` — roles only see their allowed modules
- Mobile sheet nav also filtered by role + shows `RoleBadge`, user email, sign-out button
- `Payments` module gated: `AccessDenied` rendered if `!canEditFinance` (Sales, Coordinator, Doctor, ReadOnly)
- `Settings` module gated: `AccessDenied` for non-Admin/Owner roles
- Settings page now renders full Role & Permissions Matrix table (all 7 roles × 6 permission flags)
- `ReportsDashboard` accepts `role` prop; Net Revenue and Approved Quote Value KPIs show "Restricted" for non-finance roles
- `useAuth({ requireAuth: false })` used (manual gate via `LoginScreen` instead of SDK redirect)
- `activeModule` restricted useEffect fixed to only run after `user !== undefined`

## 2026-04-14 (Bug fixes: full audit)
- Removed dead imports: Airplane, Hotel, Van, Car, Pencil, Trash, Funnel, NavigationMenu*, EmptyDrawer, QuoteDrawer, LeadList, LeadKanban, LeadDetails, ReportMetric, getContextItems (dead code)
- Fixed PatientProfile360: skip Lead query when leadId is empty/undefined to avoid bad empty-string query
- Fixed ReportsDashboard: moved Date.now() inside useMemo callbacks instead of as a dep (was re-running every render)
- Fixed LiveKanban: replaced isDentalActive with majority-wins logic so Hair leads show correctly when both services exist
- Fixed Tasks tab keyboard handler: createTask now awaited with try/catch — state no longer clears before promise resolves
- Fixed QuotesModule: renamed doubled setter names setFilterFilter* to setFilterStatus_/setFilterService_
- Fixed ContextDrawer default state: changed _drawerOpen from true to false so appointments panel starts collapsed
- Fixed DepositStatusPill: renamed currency prop to _currency to match the declared type without silently discarding it

## 2026-04-14 (Fix: setDrawerOpen not defined)
- Removed 3 stale `setDrawerOpen(true)` calls that referenced a non-existent setter
- Lead selection in inbox, kanban, and command palette now works without errors

## 2026-04-14 (UX: Remove duplicate top nav)
- Removed module nav pills from the top header bar (they duplicated the left sidebar)
- Header now shows only: brand logo, search bar, notifications, and user account button

## 2026-04-14 (Build Fix + Travel Module)
- Fixed JSX syntax error: `</Card>` → `</div>` on leads module e-card wrapper (line ~3073)
- Added missing `TravelModule` component: KPI row (total/upcoming/confirmed/pending), add travel record form, upcoming vs past sections, coordinator checklist panel, pending pickups sidebar, `TravelRecordCard` sub-component, pickup confirm button via `useMutation('TravelRecord')`
- Added `TravelRecordCard` helper component
- Marked `travel-module` TODO as done

## 2026-04-14 (Enterprise UI Redesign)
- Replaced light top-nav with dark enterprise header (glassmorphism, sidebar-bg color)
- Replaced light right-sidebar with full dark left sidebar (220px, dark bg `--color-sidebar` #0f1523)
- Sidebar sections: Workspace modules (Leads→Tasks) + Analytics (Reports+Settings) + quick stats
- All module navigation now uses `sidebar-item` CSS class with active state + hover glow
- New CSS design system in `index.css`: `kpi-card`, `e-card`, `btn-primary`, `btn-ghost`, `btn-outline`, `e-input`, `e-table`, `badge` system, shadow variables, scrollbar, animation
- KPI cards now use `kpi-card` with colored left accent bars and hover lift
- `MetricsGrid` upgraded: colored accent bars, tighter typography (30px), uppercase labels
- `ReportKpiCard` uses new `kpi-card` class
- `StatusBadge`, `UrgencyBadge`, `QuoteStatusBadge` rewritten to use `badge badge-*` CSS classes
- `EmptyState` polished: rounded-xl, dashed border, btn-primary CTA
- `LoadingSpinner` uses `text-primary` tint
- Header: dark bg, brand logo, icon+label nav pills with active=blue pill, search bar, notification dot, user avatar initial
- Module header bar: sticky breadcrumb + "Live" indicator with green pulse dot
- Mobile bottom nav: flat bottom bar with active underline + pulse FAB
- Mobile sheet nav: dark sidebar style matching desktop
- Lead inbox card wraps in `e-card`, toolbar uses `btn-primary`
- Patient cards use `e-card` with hover border effect
- Tailwind config: added sidebar color tokens + shadow tokens + updated borderRadius

## 2026-04-14 (Live Reports Dashboard)
- Replaced static `ReportBars`/`FunnelReport`/`RevenueReport`/`SourceReport` with new `ReportsDashboard` component
- All metrics are live from SDK: `useQuery(Lead)`, `useQuery(Quote)`, `useQuery(Payment)`, `useQuery(Patient)`
- Date range filter: All time / Last 30 days / Last 7 days — gates all derived metrics
- 8 KPI cards: total leads, qualification rate, deposit rate, net revenue, quote rate, show rate, response ≤30min, approved quote value
- **Overview tab**: leads by service (Dental/Hair bars), 6-month revenue trend bar chart, patient status breakdown, quote pipeline status
- **Funnel tab**: 6-stage funnel (Total → Contacted → Quoted → Deposit → Completed → Lost) with drop-off %, 4 conversion rate cards
- **Revenue tab**: KPI row (collected/net/deposits/refunds), revenue by service, revenue by payment method, monthly breakdown table
- **Sources tab**: leads by source with SourceBadge, deposit rate per source, HOT urgency per source
- **Agents tab**: per-agent table (leads/deposits/lost/deposit rate/performance bar), pipeline health mini-cards
- Added `ReportKpiCard` helper component with colored top-bar accent
- Removed static `ReportBars`, `FunnelReport`, `RevenueReport`, `SourceReport` functions (all replaced with live data)
- Marked `reports-dashboard` TODO as done

## 2026-04-14 (Payment & Deposit Tracker)
- Added `PaymentsModule` component: KPI row (total collected, deposits collected, pending deposits count, total refunded)
- `NewPaymentForm`: patient selector, amount, currency (EUR/GBP/USD/ALL), type (Deposit/Final Balance/Partial/Refund/Adjustment), method (Card/Cash/Transfer/Wise/PayPal/Crypto), transaction date, refund status, notes — wired to `useMutation("Payment")`
- Transaction ledger table: date, patient, type badge, method, refund status badge, signed amount (+/-), subtotal footer row
- Filter bar: search (patient/method/notes), type filter, method filter, patient-click filter with clear button
- Per-patient deposit status sidebar: progress bar (paid/total), outstanding balance, `DepositStatusPill` (paid/partial/unpaid)
- Revenue breakdown mini-chart: bar per payment type, net revenue row, refund deduction
- `patientFinancials` derived from approved Quote + Payment records per patient
- Added `useQuery("Payment")` in App, `payments` + `paymentsLoading` passed to `PaymentsModule`
- Added `CurrencyDollar` icon import from `@phosphor-icons/react`
- Added `payments` ModuleKey, wired into top nav, left sidebar context items, and mobile bottom nav
- Marked `payment-tracker` TODO as done

## 2026-04-14 (Quote / Treatment Plan Builder)
- Built `QuoteBuilderForm`: Dental branch (implants, crowns with crown-type selector, veneers, base price per unit) and Hair branch (graft range min/max, technique toggle FUE/DHI/Sapphire/Unshaven, price per graft)
- Multi-currency selector: EUR/GBP/USD/ALL with live conversion rates applied to all displayed prices
- Package inclusions checklist: Dental (hotel, transfer, OPG X-ray, whitening, night guard) and Hair (hotel, transfer, PRP, vitamins, cap)
- Live price summary: procedure base + package add-ons + discount % + deposit % + validity days — all computed in real-time
- `QuoteVersionHistory` component: shows all quotes for selected patient as versioned cards (v1, v2...) with status, totals, deposit, validity
- `QuotesModule` top-level component: stats row (total/approved/sent/revenue), filter bar (status + service), quote list cards, right-panel for builder or version history
- `PriceLine` helper component for consistent price row rendering
- Replaced stub `QuoteDrawer` with functional builder + version panel
- Added `PlusCircle` and `Tooth` phosphor icon imports
- Marked `quote-builder` TODO as done

## 2026-04-14 (Patient Profile 360)
- Built `PatientProfile360` component: 8-tab layout (Overview, Timeline, Tasks, Quotes, Payments, Travel, Media, Consent)
- Hero panel: avatar initials, full identity, contact links (phone/WhatsApp/email), source+service badges, inline editable allergies/critical notes via `useMutation('Patient')`
- Financial snapshot sidebar: total, discount, deposit, outstanding balance derived from approved Quote + Payment records
- Overview tab: identity grid, source/campaign details, top 3 open tasks, top 3 payments — all linked to sub-tabs
- Timeline tab: chronological sorted event list derived from lead createdAt/updatedAt, patient conversion, quotes, payments, travel dates
- Tasks tab: full task list per patient via `useQuery('Task', { where: { relatedEntityId }})`, done/reopen toggle, overdue red highlight, inline task creation
- Quotes tab: quote history cards with service images, discounted price, validity date, `QuoteStatusBadge`
- Payments tab: summary cards (total/deposit/outstanding), full ledger table with type badges, refund in red
- Travel tab: TravelRecord fields + 6-item coordinator checklist with completion indicators
- Media tab: photo grid (image preview for Photo/X-ray/Before-After, FileText icon for docs), file type badge, open link
- Consent tab: 5 consent document checklist with status badges
- Added `PatientStatusBadge`, `TravelStatusBadge`, `FinancialRow`, `DetailRow` helper components
- Added `patientProfileId` state in App; patients list cards now open Profile 360 on click
- Imported new Phosphor icons: AirplaneTakeoff, ArrowLeft, Camera, CurrencyEur, FileText, IdentificationCard, MapPin, Phone, Warning, WhatsappLogo

## 2026-04-14 (Lead Inbox)
- Built `LiveLeadList`: condensed inbox cards with relative timestamps, HOT urgency marker, 1-click WhatsApp/Call/Email actions
- Built `SourceBadge`: color-coded per channel (Facebook #1877F2, WhatsApp #25D366, TikTok #010101, Google #EA4335, etc.)
- Built `StageSelector`: dropdown driven by `DENTAL_STAGES` (20 stages) / `HAIR_STAGES` (19 stages), live `useMutation('Lead')` update, spinner feedback
- Built `LiveKanban`: 8-col dental/hair board, auto-detects service mix, overflow-x-auto scroll, HOT badges, source badges per card
- Built `LeadInboxDetail`: full detail panel — stage transition, source badge, service/sub-service, budget, travel window, notes, quick-task creation via `useMutation('Task')`, WhatsApp action button
- Built `LeadInboxFilters`: search + 4 live dropdowns (source, service, urgency, status) + Clear button, result count
- Added `DENTAL_STAGES`, `HAIR_STAGES`, `ALL_SOURCES`, `ALL_SERVICES`, `ALL_URGENCY`, `ALL_STATUSES`, `SOURCE_COLORS`, `KANBAN_DENTAL_COLS`, `KANBAN_HAIR_COLS` constants
- Replaced old `LeadList` + `LeadKanban` + `LeadDetails` with new live-connected components on the leads module
- Filter state (`filterSource`, `filterService`, `filterUrgency`, `filterStatus`) added to App state
- Marked `lead-inbox` TODO as done

## 2026-04-14
- Added SDK package `@animaapp/playground-react-sdk: 0.10.0` to package.json
- Wrapped app with `AnimaProvider` in `src/index.tsx`
- Refactored `src/App.tsx`: replaced all static mock data with `useQuery`/`useMutation`/`useAuth` SDK hooks
- Entities used: Lead, Patient, Quote, Appointment, Task (TravelRecord, Payment, MediaFile ready for next modules)
- Added `NewLeadForm` (useMutation Lead) and `NewTaskForm` (useMutation Task) with full validation
- Added real funnel, source, and revenue reports derived from live SDK data
- Added auth UI: login/logout button in header using `useAuth`
- Added overdue task highlighting (red border) from real dueDate comparisons
- Added `EmptyState` and `LoadingSpinner` components for all SDK loading/empty states
- Updated `workspace/TODO.md` with 10 actionable CRM product tasks (Albanian market context)
- Updated `workspace/CODER.md` with SDK import path and entity names
</changelog>
