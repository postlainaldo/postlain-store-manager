# Postlain Store Manager — Architecture

## Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes (server-side)
- **DB Primary**: Supabase PostgreSQL (`IS_SUPABASE=true` when env vars set)
- **DB Fallback**: SQLite via `better-sqlite3` (local dev)
- **Deploy**: Docker → Coolify on VPS (103.90.224.59)
- **Data Sync**: Odoo ERP + Palexy analytics

---

## Data Flow

```mermaid
graph TD
    Browser["Browser / PWA"]
    TopNav["TopNav + BottomNav"]
    AppShell["AppShell"]

    Browser --> TopNav
    Browser --> AppShell

    subgraph Pages
        login["/login"]
        inventory["/inventory"]
        visualboard["/visual-board"]
        schedule["/schedule"]
        report["/report"]
        sales["/sales"]
        chat["/chat"]
        collections["/collections"]
        profile["/profile"]
        settings["/settings"]
    end

    AppShell --> Pages

    subgraph API["API Routes (/api/)"]
        auth["/auth"]
        products["/products"]
        placements["/placements"]
        shifts["/shifts"]
        dailyreport["/daily-report"]
        pos["/pos"]
        customers["/customers"]
        odooapi["/odoo"]
        palexyapi["/palexy"]
        chat_api["/chat"]
        notifications["/notifications"]
        push["/push"]
        backup["/backup"]
        health["/health"]
    end

    Pages --> API

    subgraph Lib["src/lib/"]
        dbAdapter["dbAdapter.ts (dual DB)"]
        database["database.ts (SQLite singleton)"]
        supabase["supabase.ts (Supabase client)"]
        odoolib["odoo.ts"]
        palexylib["palexy.ts"]
        pushlib["push.ts"]
    end

    API --> dbAdapter
    dbAdapter -->|IS_SUPABASE=true| supabase
    dbAdapter -->|IS_SUPABASE=false| database

    subgraph Storage["Storage"]
        SupabaseDB["Supabase PostgreSQL\n(production)"]
        SQLiteDB["SQLite postlain.db\n(fallback/dev)"]
    end

    supabase --> SupabaseDB
    database --> SQLiteDB

    subgraph External["External Services"]
        Odoo["Odoo ERP"]
        Palexy["Palexy Analytics"]
        WebPush["Web Push (VAPID)"]
    end

    odoolib --> Odoo
    palexylib --> Palexy
    pushlib --> WebPush
```

---

## Database Tables

```mermaid
erDiagram
    users {
        TEXT id PK
        TEXT name
        TEXT username
        TEXT passwordHash
        TEXT role
        TEXT avatar
        TEXT status
    }
    products {
        TEXT id PK
        TEXT name
        TEXT sku
        TEXT category
        INTEGER quantity
        REAL price
    }
    shelves {
        TEXT id PK
        TEXT name
        TEXT type
    }
    slots {
        TEXT id PK
        TEXT shelfId FK
        INTEGER tier
        INTEGER position
    }
    placements {
        TEXT id PK
        TEXT productId FK
        TEXT slotId FK
    }
    shift_templates {
        TEXT id PK
        TEXT name
        TEXT startTime
        TEXT endTime
        TEXT staffType
    }
    shift_slots {
        TEXT id PK
        TEXT templateId FK
        TEXT date
        TEXT staffType
    }
    shift_registrations {
        TEXT id PK
        TEXT slotId FK
        TEXT userId FK
        TEXT status
    }
    pos_orders {
        TEXT id PK
        TEXT customerId FK
        REAL amountTotal
        TEXT state
    }
    pos_order_lines {
        TEXT id PK
        TEXT orderId FK
        TEXT productName
        REAL qty
    }
    customers {
        TEXT id PK
        TEXT name
        TEXT phone
        INTEGER totalOrders
    }
    daily_reports {
        TEXT id PK
        TEXT date
        TEXT shift
        REAL revTotal
        INTEGER traffic
    }

    shelves ||--o{ slots : has
    slots ||--o| placements : used_by
    products ||--o{ placements : placed_in
    shift_templates ||--o{ shift_slots : generates
    shift_slots ||--o{ shift_registrations : has
    users ||--o{ shift_registrations : registers
    customers ||--o{ pos_orders : places
    pos_orders ||--o{ pos_order_lines : contains
```

---

## Deploy Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub (main)
    participant GHA as GitHub Actions
    participant VPS as VPS Coolify
    participant Docker as Docker BuildKit
    participant App as Running App

    Dev->>GH: git push origin main
    GH->>GHA: trigger deploy.yml
    GHA->>VPS: SSH → Coolify API deploy
    VPS->>Docker: docker build (Dockerfile)
    Note over Docker: Stage 1: npm ci (cache /root/.npm on SSD)
    Note over Docker: Stage 2: next build (cache .next/cache on SSD)
    Note over Docker: Stage 3: Alpine runner image
    Docker->>App: container restart
```

---

## Key Rules (for AI assistant)

- **DB writes**: always go through `dbAdapter.ts` — never call `database.ts` or `supabase.ts` directly from API routes
- **IS_SUPABASE**: production always `true` (Coolify has Supabase env vars set)
- **staffType**: column exists on `shift_templates` and `shift_slots` in Supabase
- **camelCase**: Supabase PostgREST may return snake_case — use normalizer functions `sbRowToTemplate()` / `sbRowToSlot()` in dbAdapter
- **No postgres package**: use `@supabase/supabase-js` for all Supabase operations
- **Data volume**: `/app/data` mounted in Coolify for SQLite persistence
- **Native modules**: `better-sqlite3` built on Debian, copied to Alpine runner
