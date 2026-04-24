<instructions>
Stores codebase conventions, tricky quirks, and frequently used patterns.
</instructions>

<coder>
# Codebase Knowledge

## SDK (most recent — always check this first)
- Package: `@animaapp/playground-react-sdk` v0.10.0
- Import: `import { useQuery, useMutation, useLazyQuery, useAuth } from '@animaapp/playground-react-sdk'`
- Provider: `AnimaProvider` wraps root in `src/index.tsx`
- Entities: `Lead`, `Patient`, `Quote`, `Appointment`, `Task`, `TravelRecord`, `Payment`, `MediaFile`
- Entity names are PascalCase strings as first arg to all hooks
- Always handle `isPending` and `error` from `useQuery`
- `useMutation` returns `{ create, update, remove, isPending, error }`
- `useAuth` returns `{ user, isPending, isAnonymous, login, logout }`

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
- `src/index.tsx` — root with AnimaProvider
- `src/index.css` — Tailwind + custom design tokens
- `tailwind.config.js` — custom color tokens defined here
</coder>
