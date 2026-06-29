# MyDash - Dashboard Builder

A full-stack Next.js application that automates the creation of reconciliation dashboards for e-commerce operations. It fetches data from multiple sources via MCP (Model Context Protocol) tool calls, runs a reconciliation engine to normalize and merge the data, and generates interactive HTML dashboards.

## Features

- **Automated Pipeline**: Background job processing with BullMQ for reliable, retryable pipelines
- **Multi-Source Data Fetching**: Integrates with COD Network, LightFunnels, tracking services via MCP
- **Reconciliation Engine**: Phone normalization, dual schema detection, city mapping, deduplication
- **Dashboard Generation**: Standalone HTML dashboards with dark theme and responsive design
- **Prompt Management**: Google Docs-based prompt versioning with change detection
- **Real-time Progress**: Live status updates and log streaming for pipeline runs
- **Admin Interface**: Prompt management and run monitoring

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: TailwindCSS with dark theme design tokens
- **Database**: Prisma ORM with SQLite (PostgreSQL-ready)
- **Queue**: BullMQ with Redis for background job processing
- **MCP Integration**: HTTP-based tool calls to external services
- **Testing**: Jest with ts-jest for TypeScript support

## Getting Started

### Prerequisites

- Node.js 22+
- Redis (for BullMQ job queue)
- npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma db push

# Seed the database with sample data
npm run seed
```

### Development

```bash
# Start the Next.js development server
npm run dev

# Start the pipeline worker (separate terminal)
npm run worker

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Docker Compose

```bash
# Start all services (Redis + App)
docker compose up -d

# Build and start
docker compose up --build
```

## Architecture

### Pipeline Flow

1. **Load Prompts** - Fetch reconciliation and dashboard prompts from Google Docs
2. **Fetch COD Leads** - Get lead data from COD Network MCP
3. **Fetch COD Orders** - Get order data from COD Network MCP
4. **Fetch LightFunnels Orders** - Get orders from LightFunnels MCP
5. **Fetch Tracking** - Get shipment tracking data
6. **Build Merged Sheet** - Run reconciliation engine and upload to Google Sheets
7. **Build Dashboard** - Generate HTML dashboard with metrics
8. **Deploy** - Deploy the dashboard to hosting

### Reconciliation Engine

Located in `src/lib/reconciliation/`:

- **phone.ts** - Phone number normalization
  - Strips formatting characters and unicode whitespace
  - Removes leading `00` international prefix
  - Prepends country code for local numbers (leading `0` or 9-digit)
  - Supports GCC country codes: 966, 971, 965, 974, 968, 973

- **schema-detector.ts** - Dual schema detection
  - Schema A: Records with `first_name` key (COD Network format)
  - Schema B: Records with `name_1` key (LightFunnels format)

- **city-mapper.ts** - City name standardization
  - MADEENA -> Madina
  - MAKKAH -> Makkah
  - JEDDAH -> Jeddah
  - GIZAN -> Jazan
  - HOUFUF -> Hofuf
  - SYSTEM -> (empty string)

- **row-assembler.ts** - 45-column row assembly (A through AS)
- **metrics.ts** - Delivery/return/pending rate calculations
- **index.ts** - Main reconciliation orchestrator with deduplication

### Dashboard Builder

Located in `src/lib/dashboard-builder.ts`:

Generates standalone HTML pages with:
- Dark theme using design tokens
- Responsive metric cards (delivery rate, return rate, pending rate, total orders)
- Shipment summary section
- Reconciliation summary with match rate
- Optional sheet link
- Mobile-responsive layout

## Project Structure

```
src/
  app/                    # Next.js App Router pages and API routes
    api/
      runs/              # CRUD for dashboard runs
      prompts/           # Prompt management
      dashboards/        # Dashboard listing
    new/                 # New run form
    runs/[id]/           # Run detail page
    dashboard/[slug]/    # Dashboard viewer
    admin/prompts/       # Admin prompt management
  lib/
    db.ts               # Prisma client singleton
    queue.ts            # BullMQ queue setup
    prompt-loader.ts    # Google Docs prompt fetching
    mcp-client.ts       # MCP HTTP client wrapper
    dashboard-builder.ts # HTML dashboard generator
    reconciliation/     # Reconciliation engine modules
  workers/
    pipeline.worker.ts  # BullMQ pipeline worker
  __tests__/            # Unit and integration tests
prisma/
  schema.prisma         # Database schema
  seed.ts              # Seed script for development data
```

## Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma database connection string |
| `REDIS_URL` | Redis connection URL for BullMQ |
| `COD_NETWORK_MCP_URL` | COD Network MCP endpoint |
| `LIGHTFUNNELS_MCP_URL` | LightFunnels MCP endpoint |
| `TRACKING_MCP_URL` | Tracking service MCP endpoint |
| `TIKTOK_MCP_URL` | TikTok ads MCP endpoint |
| `FACEBOOK_MCP_URL` | Facebook ads MCP endpoint |
| `SHEET_MCP_URL` | Google Sheets MCP endpoint |
| `IMPORT_MCP_URL` | Import/deploy MCP endpoint |
| `MCP_AUTH_TOKEN` | Authentication token for MCP calls |
| `GOOGLE_DOC_RECONCILIATION_ID` | Google Doc ID for reconciliation prompt |
| `GOOGLE_DOC_DASHBOARD_ID` | Google Doc ID for dashboard prompt |

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- phone.test

# Run with coverage
npm test -- --coverage
```

Test files are located in `src/__tests__/` and cover:
- Phone normalization (GCC formats, edge cases)
- Schema detection (dual format support)
- City mapping (all configured mappings)
- Row assembly (45-column output validation)
- Metrics calculations (rate computations)
- Full reconciliation integration (end-to-end data flow)

## License

Private - All rights reserved.
