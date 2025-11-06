# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Business Context

This is a **contract administration automation platform** built for **CE Floyd Construction** to solve critical workflow bottlenecks in their subcontractor management process. The system was designed based on a detailed process review with their operations team (Grace, Jeff, Matthew) in October 2025.

### The Core Problem

CE Floyd's contract admin team faces three major pain points:

1. **Triple Data Entry** - The same subcontract information must be manually entered in 3 separate locations:
   - Excel buyout logs (PM-managed, tracks targets and schedules)
   - Excel tracking logs (Grace-managed, tracks document compliance)
   - Procore commitments (system of record, but tedious UI)

2. **75% Incomplete Submission Rate** - When subcontractors return signed contracts, 75% are missing required attachments (F/G/H forms), requiring manual review and repeated follow-up emails from Grace.

3. **"Brainless Work" Manual Processes** - Grace spends hours copying boilerplate templates into Procore, creating folder structures on the file server, and manually tracking document status across spreadsheets.

### Business Impact

- **1-2 hours per project** just setting up buyout logs
- **Continuous time drain** on manual data entry and document follow-up
- **Contract execution delays** when required attachments are incomplete
- **No global visibility** - Excel files are project-by-project, preventing company-wide risk assessment

### The Vision

Build an automation layer that:
- ✅ Provides at-a-glance visibility across all projects (BUILT)
- 🚧 Eliminates duplicate data entry via Excel ↔ Procore bidirectional sync (PLANNED)
- 🚧 Automatically scans documents to detect incomplete F/G/H attachments (PLANNED)
- 🚧 Auto-populates Procore commitments from buyout logs (PLANNED)
- 🚧 Generates and sends intelligent follow-up reminders (PLANNED)

## Current Feature Set (MVP)

### ✅ What's Built and Working

**1. Procore Integration (Read-Only)**
- OAuth authentication with Procore
- Automatic sync of projects and commitments via Edge Function
- Pulls subcontractor names, contract values, dates, and attachment metadata
- Token refresh handling for persistent connections

**2. Portfolio Dashboard** ([src/pages/Portfolio.tsx](src/pages/Portfolio.tsx))
- Active project count across the entire company
- Total contracts/subcontracts count
- Completion percentage for attachments
- **Projects at risk** metric (≥2 missing attachments) - addresses Jeff's need to "see where our risk is in two seconds"

**3. Tracker Grid** ([src/pages/Tracker.tsx](src/pages/Tracker.tsx))
- Excel-style view of all subcontracts with F/G/H/COI/W-9 status columns
- Filter by project to focus on a single job
- Color-coded status badges (Missing, Pending Review, Invalid, Complete)
- Replaces the need to open individual Procore commitment records

**4. Manual Document Tracking**
- Projects page: View all active projects synced from Procore
- Subcontracts page: Searchable list of all commitments
- Ability to manually update attachment status (Grace's current workflow)

**5. Reminder Composition UI** ([src/pages/Reminders.tsx](src/pages/Reminders.tsx))
- Interface to draft reminder emails to subcontractors
- Links reminders to specific subcontracts
- Tracks send status (queued, sent, bounced, failed)
- **NOTE: Email sending not yet implemented** - UI exists but emails don't actually send

**6. User Authentication & Roles**
- Role-based access (PM, Admin, Executive)
- Row-level security ensures PMs only see their assigned projects
- Settings page for Procore OAuth connection

### 🚧 Critical Missing Features (High Priority)

These are the features that will actually reduce manual work, based on meeting transcript analysis:

**1. Excel Buyout Log Import**
- **Problem Solved**: Currently PMs create buyout logs in Excel, then Grace manually re-enters all data into Procore
- **Solution**: Upload buyout log → parse XLSX → auto-create/update Procore commitments via API
- **Impact**: Saves Grace 1-2 hours per project

**2. Procore Write-Back (Commitment Creation)**
- **Problem Solved**: Grace manually copies boilerplate templates for each trade into Procore ("brainless work")
- **Solution**: API integration to create commitments, populate templates, set standard fields
- **Impact**: Reduces manual entry by 80%, eliminates copy/paste errors

**3. Document Upload & AI Scanning**
- **Problem Solved**: 75% of returned contracts have incomplete F/G/H sections, requiring manual review
- **Solution**:
  - Upload PDF contracts to Supabase Storage
  - AI/OCR scanning to detect missing sections
  - Auto-flag incomplete submissions with specific missing items
  - Generate follow-up emails listing exactly what's needed
- **Impact**: Reduces Grace's desk review from 75% of contracts to ~5-10% edge cases

**4. Automated Email Reminders**
- **Problem Solved**: Grace manually tracks and sends follow-up emails for missing documents
- **Solution**: Integrate email service (Resend/SendGrid), connect to existing reminders table
- **Impact**: "Set it and forget it" automated follow-ups

**5. Attachment G Vendor Extraction**
- **Problem Solved**: Attachment G lists sub-vendors, Grace manually copies into tracking log, then requests COIs for each
- **Solution**: OCR/AI extraction of vendor tables from Attachment G PDFs
- **Impact**: Auto-populate vendor lists, generate COI requests in bulk

**6. Excel Export/Sync**
- **Problem Solved**: Users want Excel for quick batch updates but Procore for permanent record
- **Solution**: Real-time Excel export with bidirectional sync (update Excel → pushes to Procore)
- **Impact**: Maintains familiar workflow while eliminating duplicate entry

### 📋 Lower Priority Enhancements

**7. Folder Structure Automation**
- Auto-create standardized folder structures on file server when commitments created
- Naming convention: `[cost_code]-[scope]-[subcontractor_name]-[contract_number]`

**8. COI Expiration Tracking**
- Parse insurance certificate PDFs for expiration dates (GL, Auto, Workers Comp)
- Dashboard alerts for expiring insurance
- Automated renewal reminders 30/60/90 days before expiration

**9. Buyout Schedule Tracking**
- Track lead times, target buyout dates, actual award dates
- PM accountability dashboard for on-time buyouts
- Integration with existing buyout log workflows

**10. Global Reporting**
- Cross-project analytics (Matthew's request: "I want to see this globally, not in individual Excel sheets")
- Subcontractor performance tracking
- Contract value trends and buyout savings analysis

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Routing**: React Router v6
- **State Management**: React Query (@tanstack/react-query) - installed but minimally used
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **External API**: Procore (construction project management platform)
- **Styling**: Tailwind CSS with custom configuration
- **Path Aliases**: `@/` maps to `./src/`

### Future Tech Additions (For Missing Features)

- **Excel Processing**: SheetJS (xlsx) for reading/writing Excel files
- **PDF Processing**: pdf-lib or pdf.js for document parsing
- **AI/OCR**: Claude API, OpenAI Vision, or Anthropic for document scanning
- **Email Service**: Resend, SendGrid, or Supabase Edge Function email
- **Automation**: N8N or Zapier for workflow orchestration (discussed in meeting)
- **File System**: WebDAV or SMB integration for server folder automation

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on http://[::]:8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm preview
```

## Architecture

### Database Schema

Core tables (defined in [supabase/migrations/](supabase/migrations/)):

- **profiles**: User profiles with roles (pm, admin, exec) and default filters
- **projects**: Procore projects synced via `procore_project_id`
- **subcontracts**: Contracts linked to projects via `procore_commitment_id`
- **attachments**: Required documents (F, G, H, COI, W9, Other) with validation status
- **validation_flags**: Issues found during document validation (currently unused)
- **reminders**: Email reminders to subcontractors for missing documents
- **oauth_tokens**: Procore OAuth credentials per user

Key enums:
- `app_role`: pm, admin, exec
- `subcontract_status`: Draft, Out for Signature, Executed
- `attachment_type`: F, G, H, COI, W9, Other
- `attachment_status`: Missing, Pending Review, Invalid, Complete
- `severity_level`: info, warn, error (for validation flags)
- `send_status`: queued, sent, bounced, failed (for reminders)

### Procore Integration

Three Supabase Edge Functions in [supabase/functions/](supabase/functions/):

1. **procore-auth**: Initiates OAuth flow (no JWT verification required)
2. **procore-callback**: Handles OAuth callback, stores tokens (no JWT verification)
3. **procore-sync**: Syncs projects, commitments, and attachments from Procore (requires JWT)

All functions use Deno runtime. The sync function currently:
- Fetches projects from Procore REST API
- Syncs subcontracts (called "commitments" in Procore) for each project
- Downloads attachment metadata (but not actual files yet)
- Updates attachment status based on sync results

**What Needs to Be Added:**
- POST/PUT operations to Procore API for creating/updating commitments
- Document download and storage
- Template management and population
- Bidirectional sync with Excel data

### Authentication & Authorization

- Uses Supabase Auth with email/password authentication
- `ProtectedRoute` component wraps all authenticated routes (see [src/App.tsx](src/App.tsx))
- Row Level Security (RLS) policies control data access at the database level
- OAuth tokens for Procore integration stored in `oauth_tokens` table per user
- Service role key used in Edge Functions to bypass RLS when needed

### Frontend Structure

```
src/
├── App.tsx                    # Main app with routing and ProtectedRoute wrapper
├── main.tsx                   # Entry point, renders App
├── pages/                     # Page components (all are default exports)
│   ├── Portfolio.tsx          # Dashboard with project stats and risk metrics
│   ├── Projects.tsx           # Project list view (synced from Procore)
│   ├── Subcontracts.tsx       # Subcontract/commitment list with search
│   ├── Tracker.tsx            # Excel-style attachment tracking grid
│   ├── Reminders.tsx          # Email reminder composition (sending not implemented)
│   ├── Settings.tsx           # User settings & Procore OAuth connection
│   └── Auth.tsx               # Login/signup page
├── components/
│   ├── AppLayout.tsx          # Layout wrapper with header & sidebar
│   ├── AppHeader.tsx          # Top navigation bar with logo
│   ├── AppSidebar.tsx         # Side navigation menu
│   ├── StatusBadge.tsx        # Color-coded status badges for attachments
│   └── ui/                    # shadcn/ui components (auto-generated)
├── hooks/
│   ├── use-mobile.tsx         # Responsive design hook
│   └── use-toast.ts           # Toast notification hook
├── integrations/supabase/
│   ├── client.ts              # Supabase client instance
│   └── types.ts               # Auto-generated TypeScript types from DB schema
└── lib/
    └── utils.ts               # Utility functions (cn for classnames, etc.)
```

### Data Flow Pattern

Pages currently follow this pattern:
1. Use `useState` for local state
2. Use `useEffect` to fetch data directly via Supabase client
3. Direct Supabase queries: `supabase.from('table').select(...)`
4. React Query is installed but not actively used (could be leveraged for caching/optimistic updates)

Example from [src/pages/Tracker.tsx](src/pages/Tracker.tsx):
```typescript
const [subcontracts, setSubcontracts] = useState([]);
useEffect(() => {
  const loadData = async () => {
    const { data } = await supabase
      .from('subcontracts')
      .select('*')
      .eq('project_id', selectedProjectId);
    setSubcontracts(data || []);
  };
  loadData();
}, [selectedProjectId]);
```

### Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID`: Supabase project ID

**Note**: Procore API credentials are NOT in `.env` - they're obtained via OAuth flow and stored per-user in the `oauth_tokens` table.

## Key Development Patterns

### Adding a New Page

1. Create page component in `src/pages/NewPage.tsx` with default export
2. Add route in [src/App.tsx](src/App.tsx) Routes section
3. Wrap with `<ProtectedRoute>` if authentication required
4. Add navigation link in [src/components/AppSidebar.tsx](src/components/AppSidebar.tsx)

### Working with Supabase

- Import client: `import { supabase } from "@/integrations/supabase/client"`
- Types are in `src/integrations/supabase/types.ts` (auto-generated from schema)
- RLS policies enforce access control - queries automatically filtered by user permissions
- Use service role key in Edge Functions to bypass RLS when needed (e.g., procore-sync)

### Styling with Tailwind

- Global styles in [src/index.css](src/index.css)
- Component styles in [src/App.css](src/App.css)
- Use `cn()` from `@/lib/utils` to merge Tailwind classes conditionally
- Custom theme configured in [tailwind.config.ts](tailwind.config.ts)

### Working with shadcn/ui Components

- Components are in `src/components/ui/`
- Import and use directly: `import { Button } from "@/components/ui/button"`
- Configuration in [components.json](components.json)
- All components built on Radix UI primitives with Tailwind styling

## Supabase Development

### Running Migrations

Migrations are in [supabase/migrations/](supabase/migrations/) and run automatically via Supabase platform. To work locally:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link to project (requires auth)
supabase link --project-ref hdrkajhfpqkvnhuuoozr

# Run migrations locally
supabase db push

# Generate new migration
supabase migration new <migration_name>
```

### Regenerating Types

After schema changes:
```bash
supabase gen types typescript --project-id hdrkajhfpqkvnhuuoozr > src/integrations/supabase/types.ts
```

### Testing Edge Functions Locally

```bash
# Test the Procore sync function
supabase functions serve procore-sync

# Invoke with test data
curl -i --location --request POST 'http://localhost:54321/functions/v1/procore-sync' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

## Procore API Integration

### Current Implementation (Read-Only)

The `procore-sync` Edge Function currently:
- Uses OAuth 2.0 with tokens stored per-user
- Fetches projects: `GET /rest/v1.0/projects`
- Fetches commitments: `GET /rest/v1.0/projects/{project_id}/commitments`
- Processes attachment metadata from commitment records

**Procore API Documentation**: https://developers.procore.com/documentation/rest-api-overview

### Planned Implementation (Write Operations)

To implement the missing automation features, we need to add:

1. **Create Commitments**: `POST /rest/v1.0/projects/{project_id}/commitments`
2. **Update Commitments**: `PATCH /rest/v1.0/projects/{project_id}/commitments/{id}`
3. **Upload Documents**: `POST /rest/v1.0/projects/{project_id}/documents`
4. **Manage Templates**: Procore's inclusion templates or custom template management

**Key Consideration from Meeting**: Matthew confirmed "Procore's API is wide open. Everything can be pulled and also written back into Procore."

### Procore Helix (Native AI)

During the meeting, Hudson noted: "Procore Helix is the name of their AI platform. They allegedly have a pretty comprehensive file sorting process."

**Action Item**: Evaluate Procore Helix capabilities before building custom solutions for:
- File sorting and organization
- Document classification
- Potential native document validation

This could reduce custom development scope significantly.

## Key Business Workflows

### Current Workflow (Manual)

1. **PM awards contract** → Sends email to Grace with subcontractor name, value
2. **Grace creates Excel buyout log entry** → Manual data entry
3. **Grace creates Procore commitment** → Manual copy/paste of templates
4. **Grace creates server folder structure** → Manual folder creation with naming conventions
5. **Grace adds to Excel tracking log** → Yet more manual entry (duplicate data)
6. **Subcontractor returns signed contract** → 75% chance it's incomplete
7. **Grace manually reviews PDF** → Checks for F/G/H sections page by page
8. **Grace sends follow-up email** → Manually lists missing items
9. **Repeat steps 6-8** until complete
10. **Grace updates status** in Excel tracking log, Procore, and buyout log

**Total Time Per Contract**: 1-3 hours depending on number of follow-ups needed

### Target Workflow (Automated)

1. **PM awards contract** → Sends email to Grace (same)
2. **Grace uploads buyout log or enters award details once** → System auto-syncs to Procore
3. **System creates Procore commitment** → Auto-populated with templates
4. **System creates server folder structure** → Automated with correct naming
5. **Tracking log auto-updates** → Single source of truth
6. **Subcontractor returns signed contract** → Uploaded to system
7. **AI scans PDF** → Detects missing F/G/H sections automatically
8. **System sends follow-up email** → Auto-generated with specific missing items
9. **Repeat AI scan** when resubmitted, auto-update status
10. **Grace reviews dashboard** → Only handles exceptions, not every contract

**Target Time Per Contract**: 15-30 minutes (80-90% reduction)

## Important Notes

### Project History

- Built with Lovable (lovable.dev) - see [README.md](README.md)
- Changes can be made via Lovable UI or by pushing to Git repository
- Initial build focused on read-only dashboards and UI foundation
- Next phase focuses on automation and bidirectional integrations

### Known Limitations

1. **Email Reminders UI exists but doesn't actually send emails** - needs SendGrid/Resend integration
2. **No document storage yet** - Supabase Storage bucket needs to be configured
3. **Procore sync is read-only** - write operations not yet implemented
4. **No Excel import/export** - XLSX library not integrated
5. **No AI document scanning** - Claude API or OCR service not integrated
6. **validation_flags table exists but is unused** - no validation logic yet

### Quick Wins for Next Sprint

Based on meeting priorities and current architecture:

1. **Add Excel import for buyout logs** (SheetJS library, new upload UI)
2. **Implement Procore write-back for commitments** (extend procore-sync Edge Function)
3. **Enable actual email sending** (Resend or SendGrid Edge Function integration)

These three features address the highest-impact pain points and require minimal new infrastructure.

### Configuration

- Vite dev server runs on port 8080 (configured in [vite.config.ts](vite.config.ts))
- `lovable-tagger` plugin active in development mode for Lovable integration
- Procore OAuth credentials stored per-user (not shared across team)
- Missing document count (`missing_count`) on subcontracts calculated during sync

## Stakeholder Reference

### Grace Brookens (Operations Manager - Primary User)
**Responsibilities**: Contract administration, document tracking, reminder follow-ups
**Pain Points**: "Brainless work" copying templates, manual PDF review, continuous follow-up emails
**Success Metrics**: Time saved on data entry, reduction in incomplete submissions reaching her desk

### Jeff Palmer (Project Executive)
**Needs**: At-a-glance risk visibility, accountability tracking, cross-project views
**Quote**: "I can pull up this file and see where our risk is in two seconds"
**Success Metrics**: Dashboard accuracy, speed of risk identification

### Matthew McMenamin (Technical Lead)
**Concerns**: Eliminate duplicate data entry, enable global reporting, leverage Procore API fully
**Quote**: "I hate this in Excel because it compartmentalizes our data by project"
**Success Metrics**: Single source of truth, cross-project analytics, reduced manual entry

## Future Considerations

### Automation Platform Discussion (From Meeting)

Hudson recommended exploring **N8N** (n8n.io) for workflow automation:
- Visual workflow builder
- Native Procore integration potential
- Can handle Excel → Procore → Email workflows
- Alternative to custom Edge Function development for some features

### Integration Opportunities

1. **DocuSign Advanced** - Discussed for required field enforcement (currently too expensive)
2. **Smart Sheets or Airtable** - Alternative to Excel for global views
3. **Procore Helix AI** - Native Procore AI features may solve file sorting/classification

### Technical Debt to Address

- Move from `useEffect` + `useState` to React Query for better caching
- Implement optimistic updates for status changes
- Add real-time subscriptions for multi-user collaboration
- Build comprehensive test suite (currently no tests)
- Add error boundary components for graceful failure handling
