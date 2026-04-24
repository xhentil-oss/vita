<instructions>
Stores codebase conventions, tricky quirks, and frequently used patterns.
</instructions>

<coder>
# Codebase Knowledge

## Data Layer (Firebase — replaces Anima SDK)
- Auth: `FirebaseProvider` wraps root in `src/index.tsx`; Google OAuth via `signInWithPopup`
- Firestore: real-time listeners via `onSnapshot` — collections: leads, patients, quotes, appointments, tasks, travelRecords, payments, mediaFiles, services
- Import: `import { useQuery, useMutation } from '@/hooks/useFirestore'`
- Import: `import { useAuth } from '@/hooks/useFirebaseAuth'`
- `useQuery(entity, idOrOptions?)` — returns `{ data, isPending, error }`; pass string id for single doc, options object for collection
- `useMutation(entity)` — returns `{ create, update, remove, isPending, error }`
- Entity names are PascalCase strings (same as before): `Lead`, `Patient`, `Quote`, `Appointment`, `Task`, `TravelRecord`, `Payment`, `MediaFile`
- Always handle `isPending` and `error` from `useQuery`

## UI Conventions
- All icon sizes use numeric `size` prop (e.g., `size={16}`) — NOT `size="sm"`
- `@phosphor-icons/react` is the icon library
- UI components live in `src/components/ui/` (shadcn-style)
- CSS utility alias: `@/*` → `./src/components/ui/$1`
- Tailwind custom tokens: `bg-primary`, `bg-tertiary`, `text-muted-foreground`, `bg-error`, `bg-warning`, `bg-accent`, `bg-dashboard-hero`

## Project Context
- Medical Tourism CRM for Albanian clinics (Dental + Hair Transplant)
- Two main pipelines: Dental Tourism pipeline + Hair Transplant pipeline
- Target users: Sales Agent, Patient Coordinator, Doctor, Finance, Admin, Clinic Owner
- Primary channel: WhatsApp (treat as first-class, not a plugin)
- Key metrics: CPL, CAC, close rate, no-show rate, deposit rate, response time

## File Structure
- `src/App.tsx` — main monolithic component (all modules rendered here)
- `src/index.tsx` — root with FirebaseProvider
- `src/lib/firebase.ts` — Firebase app init (auth + db)
- `src/FirebaseProvider.tsx` — Google OAuth context
- `src/hooks/useFirestore.ts` — useQuery + useMutation hooks
- `src/hooks/useFirebaseAuth.ts` — useAuth hook
- `src/index.css` — Tailwind + custom design tokens
- `tailwind.config.js` — custom color tokens defined here
</coder>
