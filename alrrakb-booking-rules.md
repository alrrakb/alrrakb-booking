# ============================================================
#  ALRRAKB BOOKING — PROJECT RULES & ARCHITECTURAL CONTRACT
#  Owner: مؤسسة طلائع الركب  |  Maintained by: Lead AI Architect
#  Generated: 2026-03-12  |  Stack snapshot: Next.js 16, React 19
# ============================================================
#
# This file is the single source of truth for every human developer
# and every AI agent working on this codebase.
# Deviating from these rules without explicit owner approval is PROHIBITED.
#

# ──────────────────────────────────────────────────────────────
# SECTION 1 — TECH STACK (DO NOT CHANGE WITHOUT APPROVAL)
# ──────────────────────────────────────────────────────────────

## Core Framework
- **Next.js 16** (App Router, React Server Components enabled — `rsc: true`)
- **React 19** with TypeScript 5 (strict mode)
- Deployment target: **Vercel** (Serverless + Edge Functions)

## Styling
- **Tailwind CSS v4** via `@tailwindcss/postcss` — CSS-first config (no `tailwind.config.js`)
- **shadcn/ui** (style: `base-nova`, icon library: `lucide-react`)
- CSS variables are enabled (`cssVariables: true` in `components.json`)
- Global styles live exclusively in `src/app/globals.css`
- `tailwind-merge` + `clsx` → always use the `cn()` utility from `@/lib/utils`

## Typography & Fonts
- **Cairo** (Arabic + Latin) — primary UI font, CSS var: `--font-cairo`
- **Geist** (Latin) — code/mono fallback, CSS var: `--font-sans`
- Both fonts are loaded via `next/font/google` in the root layout exclusively

## Backend / Database
- **Supabase** (`@supabase/supabase-js` v2, `@supabase/ssr` v0.9)
- Primary tables: `bookings`, `booking_options`
- Authentication: Supabase Auth — Email/Password for admins
- Real-time: Supabase Realtime (admin dashboard channel only)

## Forms & Validation
- **react-hook-form** + **zod** (via `@hookform/resolvers`)
- All form schemas must be defined in a co-located or shared `schemas/` file using Zod

## Date Handling
- **date-fns** v4 — the ONLY date utility allowed (no moment.js, no dayjs)

## Notifications
- **Sonner** (`<Toaster>` already mounted in root layout at `position="top-center" richColors`)

## i18n
- **next-intl** — route-based (`/ar/...` and `/en/...`)  
  Install with: `pnpm add next-intl`

## Animations
- `tailwindcss-animate` + `tw-animate-css` (already installed, no Framer Motion unless approved)


# ──────────────────────────────────────────────────────────────
# SECTION 2 — ARCHITECTURE & DIRECTORY STRUCTURE (STRICT)
# ──────────────────────────────────────────────────────────────

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # next-intl locale wrapper (ar | en)
│   │   ├── (main)/               # Public-facing booking routes
│   │   │   └── page.tsx          # Booking form page (Server Component)
│   │   ├── admin/                # Admin dashboard (protected)
│   │   │   ├── layout.tsx        # Admin shell layout
│   │   │   ├── page.tsx          # Bookings list (Realtime)
│   │   │   └── login/
│   │   │       └── page.tsx      # Admin login page
│   │   └── layout.tsx            # Locale-aware root layout
│   ├── api/                      # Next.js Route Handlers (REST endpoints only)
│   ├── actions.ts                # ⚠ LEGACY — must be refactored to src/actions/
│   ├── globals.css               # Global Tailwind styles (single source)
│   └── layout.tsx                # Root layout (fonts, Toaster)
│
├── actions/                      # Server Actions (grouped by domain)
│   ├── booking.actions.ts        # submitBooking, getBookings, etc.
│   └── options.actions.ts        # addBookingOption, updateBookingOption, etc.
│
├── components/
│   ├── ui/                       # shadcn/ui primitives — DO NOT hand-edit
│   ├── booking/                  # Booking-domain components
│   ├── admin/                    # Admin-domain components
│   └── shared/                   # Reusable cross-domain components
│
├── hooks/                        # Custom React hooks (client-side only)
│   └── use-realtime-bookings.ts  # Example: Supabase Realtime hook
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   └── server.ts             # Server Supabase client factory (for Server Actions / RSC)
│   ├── utils.ts                  # cn(), formatDate(), etc.
│   └── constants.ts              # App-wide constants (SUPPORTED_LOCALES, etc.)
│
├── middleware.ts                 # Auth guard + next-intl locale routing
│
├── messages/                     # next-intl translation files
│   ├── ar.json
│   └── en.json
│
└── schemas/                      # Zod schemas shared between client and server
    └── booking.schema.ts
```

### Hard Rules for Directory Structure
1. **Never place business logic inside a `page.tsx` or `layout.tsx`**. Extract to actions or hooks.
2. **`components/ui/`** is managed by the shadcn CLI. Do NOT manually edit files in this directory.
3. **Server Actions** belong in `src/actions/`, never inline in page files (except trivial one-liners approved by the team).
4. **Custom hooks** (`src/hooks/`) may only run in Client Components. Never import hooks into Server Components.
5. **Schemas** (`src/schemas/`) are pure Zod — no Next.js or React imports allowed inside them.


# ──────────────────────────────────────────────────────────────
# SECTION 3 — SUPABASE CLIENT PATTERN (HARD RULE)
# ──────────────────────────────────────────────────────────────

## ❌ FORBIDDEN — Inline Client Creation
```typescript
// NEVER do this inside a Server Action, Route Handler, or Component
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
);
```

## ✅ REQUIRED — Centralized Factory Pattern

### `src/lib/supabase/server.ts`
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types"; // generated types

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  );
}

// For admin operations that bypass RLS (use SERVICE_ROLE_KEY — server only)
export async function createSupabaseAdminClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

### `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Usage in Server Actions
```typescript
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitBooking(values: BookingValues) {
  const supabase = await createSupabaseServerClient();
  // ... query
}
```

### Usage in Client Components (Realtime / Browser Queries)
```typescript
"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient(); // call once, outside component
```

### MIGRATION REQUIRED
- The current `src/app/actions.ts` **must be refactored** to use the centralized factory.
- All four Server Actions (`submitBooking`, `getBookingOptions`, `addBookingOption`, `updateBookingOption`, `deleteBookingOption`) must be moved to `src/actions/booking.actions.ts` and `src/actions/options.actions.ts`.


# ──────────────────────────────────────────────────────────────
# SECTION 4 — CODING CONVENTIONS
# ──────────────────────────────────────────────────────────────

## File & Directory Naming
| Entity              | Convention         | Example                        |
|---------------------|--------------------|--------------------------------|
| Pages/Layouts       | `page.tsx`         | `app/[locale]/admin/page.tsx`  |
| Components          | `kebab-case.tsx`   | `booking-form.tsx`             |
| Server Actions      | `kebab-case.actions.ts` | `booking.actions.ts`      |
| Hooks               | `use-kebab-case.ts`| `use-realtime-bookings.ts`     |
| Schemas             | `kebab-case.schema.ts` | `booking.schema.ts`        |
| Utility functions   | `kebab-case.ts`    | `format-date.ts`               |
| Types/Interfaces    | `PascalCase`       | `BookingOption`, `AdminUser`   |
| Zod schemas         | `camelCase + Schema` | `bookingSchema`, `optionSchema` |
| Constants           | `SCREAMING_SNAKE`  | `SUPPORTED_LOCALES`            |
| React components    | `PascalCase`       | `BookingForm`, `AdminHeader`   |
| Supabase DB columns | `snake_case`       | `check_in`, `rooms_count`      |

## TypeScript Rules
- **Strict mode** is ON (`tsconfig.json`). Never disable it.
- Always type function return values explicitly for Server Actions.
- Prefer `type` over `interface` for data shapes; use `interface` only for extendable contracts.
- Never use `any`. Use `unknown` and narrow the type.
- Use Supabase-generated types from `src/types/database.types.ts` (generate with `supabase gen types typescript`).
- All props must be typed. No implicit `React.FC` without explicit prop types.

## Server vs Client Components
| Use Server Component when…               | Use Client Component when…                         |
|-------------------------------------------|----------------------------------------------------|
| Fetching data from Supabase               | Using `useState`, `useEffect`, `useReducer`        |
| Accessing `cookies()` or `headers()`      | Subscribing to Supabase Realtime                   |
| Rendering static/SEO content              | Handling form interactions (react-hook-form)       |
| Running Server Actions                    | Using browser APIs (localStorage, window, etc.)    |
| Admin page initial data load              | Admin dashboard Realtime subscription              |

- Default to **Server Components**. Only add `"use client"` when strictly necessary.
- Never import a Client Component into a Server Component file's top-level scope if it forces the parent to become a client. Use composition patterns (pass as `children` or RSC props).

## Component Structure (Standard Template)
```typescript
// 1. Directives (if needed)
"use client";

// 2. External imports (alphabetized)
import { useState } from "react";
import { useTranslations } from "next-intl";

// 3. Internal imports
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 4. Types / interfaces
type Props = {
  initialValue: string;
};

// 5. Component
export function MyComponent({ initialValue }: Props) {
  // hooks first
  const t = useTranslations("MyComponent");
  const [value, setValue] = useState(initialValue);

  // handlers
  // render
  return <div>{value}</div>;
}
```

## Comments Policy
- Write JSDoc comments for every exported function, hook, and Server Action.
- Add inline comments for any non-obvious logic (e.g., Supabase filter reasoning, RLS gotchas).
- AI agents MUST add `// TODO:` comments when leaving incomplete stubs, never silent empty functions.


# ──────────────────────────────────────────────────────────────
# SECTION 5 — i18n & RTL/LTR SUPPORT (STRICT)
# ──────────────────────────────────────────────────────────────

## Setup
- Use **next-intl** with route-based locale segments: `/ar/...` and `/en/...`
- Supported locales: `ar` (default) and `en`
- Default locale fallback: `ar`
- Locale config lives in `src/lib/constants.ts`:
  ```typescript
  export const SUPPORTED_LOCALES = ["ar", "en"] as const;
  export type Locale = (typeof SUPPORTED_LOCALES)[number];
  export const DEFAULT_LOCALE: Locale = "ar";
  ```

## Translation Files
- All user-facing strings must live in `src/messages/ar.json` and `src/messages/en.json`.
- **Never hardcode Arabic or English strings in components.** Always use `t("key")`.
- Namespace translation keys by component/feature:
  ```json
  {
    "BookingForm": {
      "title": "احجز الآن",
      "name_label": "الاسم الكامل",
      "submit_button": "إرسال الطلب"
    },
    "AdminDashboard": {
      "title": "إدارة الحجوزات"
    }
  }
  ```

## Middleware (Locale Routing + Auth Guard)
`src/middleware.ts` must handle both locale routing (next-intl) AND admin auth protection:
```typescript
import { createMiddleware } from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/lib/constants";

const intlMiddleware = createMiddleware({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
});

export async function middleware(request: NextRequest) {
  // 1. Admin route guard
  if (request.nextUrl.pathname.includes("/admin")) {
    // Supabase session check — redirect to /[locale]/admin/login if unauthenticated
  }
  // 2. Apply i18n routing
  return intlMiddleware(request);
}
```

## Directionality (RTL / LTR)
- The HTML `dir` and `lang` attributes MUST be set dynamically based on the active locale:
  ```tsx
  // src/app/[locale]/layout.tsx
  <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
  ```
- Never hardcode `dir="rtl"` in the root `layout.tsx` (currently done — must be fixed after i18n setup).
- Use Tailwind's logical CSS properties for all layout spacing:
  | ❌ Physical (avoid) | ✅ Logical (prefer) |
  |--------------------|--------------------|
  | `pl-4`             | `ps-4`             |
  | `pr-4`             | `pe-4`             |
  | `ml-auto`          | `ms-auto`          |
  | `text-right`       | `text-end`         |
  | `text-left`        | `text-start`       |
- For absolutely-positioned popups/dropdowns that need physical placement (e.g., tooltips), use the `dir` CSS variable or `[dir=rtl]:` variant.
- The Cairo font must be active for Arabic locales. Geist may be used for English only:
  ```tsx
  className={locale === "ar" ? "font-cairo" : "font-sans"}
  ```

## RTL-Aware Icon Mirroring
- Icons that convey direction (arrows, chevrons) must be mirrored for RTL. Use:
  ```tsx
  <ChevronRight className="rtl:rotate-180 transition-transform" />
  ```


# ──────────────────────────────────────────────────────────────
# SECTION 6 — AUTHENTICATION & AUTHORIZATION
# ──────────────────────────────────────────────────────────────

## Strategy
- **Supabase Auth** (Email/Password) for admin users only
- Public booking form requires NO authentication
- Enforce a **hybrid security model**:
  1. **Next.js Middleware** (network layer) — redirects unauthenticated requests away from `/[locale]/admin/**`
  2. **Supabase RLS Policies** (database layer) — deny unauthorized reads/writes even if middleware is bypassed

## Admin Route Protection (Middleware Rules)
```typescript
// Protected pattern: /<locale>/admin (but NOT /<locale>/admin/login)
const isAdminRoute = /\/(ar|en)\/admin/.test(pathname);
const isLoginPage = /\/(ar|en)\/admin\/login/.test(pathname);
```

## RLS Policy Rules
- `bookings` table:
  - `SELECT`: Authenticated users (admin) OR service_role
  - `INSERT`: `anon` role only (public form submission)
  - `UPDATE/DELETE`: Authenticated admin only
- `booking_options` table:
  - `SELECT`: Public (`anon`) — needed for the booking form
  - `INSERT/UPDATE/DELETE`: Authenticated admin only
- **NEVER disable RLS** on any table. If a query unexpectedly fails, fix the RLS policy — do not switch to `service_role` as a workaround unless the admin client factory is used correctly.

## Environment Variables
```bash
# Public (exposed to browser — safe, anon key only)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only (NEVER expose to client — must not start with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=
```
- The `SUPABASE_SERVICE_ROLE_KEY` must ONLY be used in `createSupabaseAdminClient()` inside Server Actions or Route Handlers.
- AI agents must NEVER reference `SUPABASE_SERVICE_ROLE_KEY` in any `"use client"` file.


# ──────────────────────────────────────────────────────────────
# SECTION 7 — DATA FETCHING & STATE MANAGEMENT
# ──────────────────────────────────────────────────────────────

## General Hierarchy (prefer top-down)
1. **RSC Data Fetching** — Fetch in `page.tsx` via `await supabase.from(...)`, pass as props. Best for SEO pages.
2. **Server Actions** — For mutations (forms, CRUD). Always return `{ success: boolean; error?: string }`.
3. **Supabase Realtime** — Only for the admin dashboard booking list.
4. **Client-side fetch** — Use only for non-critical, user-triggered interactions if RSC is not possible.
5. **Zustand / Jotai** — NOT permitted unless approved by the project owner.

## Server Actions Contract
Every Server Action must:
```typescript
"use server";

// ✅ Standard return shape
type ActionResult<T = null> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function myAction(payload: MyPayload): Promise<ActionResult<MyData>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("my_table").insert([payload]).select();

  if (error) {
    console.error("[myAction] DB Error:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/[locale]/admin");
  return { success: true, data };
}
```

## Revalidation Strategy
- Use `revalidatePath()` after every mutation Server Action.
- After i18n migration, revalidate the locale-prefixed path:  
  `revalidatePath("/ar/admin")` AND `revalidatePath("/en/admin")`
- Use `revalidateTag()` for fine-grained cache control on shared data (e.g., booking options used on multiple pages).

## Supabase Realtime (Admin Dashboard Only)
```typescript
// src/hooks/use-realtime-bookings.ts
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookingRow } from "@/types/database.types";

/**
 * Subscribes to the bookings table and returns live-updating data.
 * Only use this hook in admin dashboard Client Components.
 */
export function useRealtimeBookings(initialData: BookingRow[]) {
  const [bookings, setBookings] = useState(initialData);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
        // Handle INSERT, UPDATE, DELETE
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return bookings;
}
```


# ──────────────────────────────────────────────────────────────
# SECTION 8 — VERCEL DEPLOYMENT RULES
# ──────────────────────────────────────────────────────────────

- All Server Actions and Route Handlers run as **Serverless Functions** on Vercel (Node.js runtime)
- The middleware (`src/middleware.ts`) runs on the **Vercel Edge Runtime** — it must NOT import Node.js-only modules
- `next.config.ts` must NOT set `output: 'standalone'` (not needed for Vercel)
- Environment variables must be configured in Vercel Dashboard → Project → Settings → Environment Variables
- Never commit `.env.local` to git (`.gitignore` already covers this)
- Validate that `SUPABASE_SERVICE_ROLE_KEY` is set only in "Server-side" scope in Vercel (not "Preview client-side")
- Image optimization: Use `next/image` for all images; configure `remotePatterns` in `next.config.ts` for Supabase Storage URLs


# ──────────────────────────────────────────────────────────────
# SECTION 9 — STRICT AI AGENT INSTRUCTIONS
# ──────────────────────────────────────────────────────────────

## 🚫 Hard Prohibitions — AI agents must NEVER:

1. **Install new core dependencies** (`npm install`, `pnpm add`) without explicit user approval. Read the tech stack in Section 1 first. If a new library is needed, propose it and wait for confirmation.

2. **Inline Supabase client creation** in any file. Always import from `@/lib/supabase/server` or `@/lib/supabase/client`. See Section 3.

3. **Hardcode locale strings** (Arabic or English text) inside components. All strings live in `src/messages/{locale}.json`.

4. **Disable TypeScript strict checks** with `@ts-ignore` or `@ts-nocheck`. Fix the type error instead.

5. **Edit files in `src/components/ui/`** directly. These are managed by the shadcn CLI. Use `npx shadcn add <component>` instead.

6. **Add `"use client"` to a file unnecessarily.** Every new component defaults to Server Component. Add `"use client"` only when hooks or browser APIs are required, and justify it with a comment.

7. **Bypass RLS** by using `SUPABASE_SERVICE_ROLE_KEY` in browser code or as a workaround. Use the admin client factory only when architecturally justified.

8. **Create new API routes** (`src/app/api/`) for data fetching that could be handled by a Server Action or RSC. Prefer Server Actions.

9. **Use physical Tailwind utilities** (`pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`) in new components. Use logical properties (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`).

10. **Generate migration files** or alter the Supabase database schema without explicit user confirmation. Always present the SQL first.

## ✅ Required Behaviors — AI agents must ALWAYS:

1. **Follow the directory structure** defined in Section 2. Place files in the correct domain folder.

2. **Use the `cn()` utility** for all conditional or merged class names. Never concatenate strings manually.

3. **Type everything**. Provide explicit TypeScript types for all function parameters, return values, and props.

4. **Write JSDoc** for every exported function, hook, and Server Action.

5. **Add a `// Comment`** explaining any non-obvious logic, RLS interactions, or caching decisions.

6. **Use Zod schemas** for all form and server action validation. Co-locate schemas in `src/schemas/`.

7. **Use `date-fns`** for any date formatting or calculation — never raw `Date` manipulation.

8. **Use `useTranslations()`** from `next-intl` for all UI text after i18n migration.

9. **Prefer composition** over duplication. If the same JSX block appears twice, extract it into a shared component in `src/components/shared/`.

10. **Revalidate paths** after every mutation Server Action.

11. **Leave a `// TODO:` comment** with a clear description if a task is incomplete or requires follow-up.

12. **Respect the Server/Client boundary** — never import server-only modules in `"use client"` files.

## 🏗 Migration Debt (Priority Tasks for AI Agents)
The following must be completed before new features are added:
- [ ] Refactor `src/app/actions.ts` → split into `src/actions/booking.actions.ts` + `src/actions/options.actions.ts`, using `createSupabaseServerClient()`.
- [ ] Create `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`.
- [ ] Set up next-intl with `src/messages/ar.json` + `src/messages/en.json`.
- [ ] Migrate `src/app/layout.tsx` root layout `dir="rtl"` hardcode to dynamic locale-based `dir` in `src/app/[locale]/layout.tsx`.
- [ ] Generate Supabase TypeScript types into `src/types/database.types.ts`.
- [ ] Implement `src/middleware.ts` combining next-intl routing + admin auth guard.

# ──────────────────────────────────────────────────────────────
# END OF RULES — Last updated: 2026-03-12
# ──────────────────────────────────────────────────────────────
