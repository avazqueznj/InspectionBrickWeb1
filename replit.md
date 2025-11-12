# Inspection Brick

## Overview

Inspection Brick is a professional web application designed for managing equipment and vehicle inspections, with a strong emphasis on Department of Transportation (DOT) compliance. Its primary purpose is to provide a clean and efficient interface for viewing inspection records, analyzing defects, and generating reports. The application supports multi-company data isolation, real-time search and filtering, detailed defect tracking with severity levels, and server-side pagination for optimal performance. The project aims to streamline inspection processes, enhance operational efficiency, and ensure regulatory compliance for organizations.

## User Preferences

### Design Approach
- Information-dense, professional enterprise tool
- Clean, efficient workflows with minimal friction
- Consistent spacing and visual hierarchy
- Subtle hover interactions (no heavy animations)
- Data clarity over decorative elements
- "New Jersey style" - simple, straightforward solutions over complex libraries

### Code Style
- TypeScript strict mode
- Functional React components with hooks
- Zod for runtime validation
- TanStack Query for server state
- data-testid attributes on all interactive elements

### Important User Requirements
- **NO PDFs ever** - Use browser's native print (Ctrl+P/Cmd+P) instead
- **NO complex test scripts** - Keep testing simple and manual
- **Simple solutions preferred** - Avoid over-engineering with unnecessary libraries
- **Print reports:** Server-rendered HTML in new browser tabs for optimal print formatting

## System Architecture

The application employs a client-server architecture with a clear separation of concerns.

### Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI components
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter (frontend), Express (backend)
- **Validation:** Zod

### UI/UX Decisions
The application features a dark industrial theme with orange (#FF5722) branding accents, prioritizing a professional, enterprise-tool aesthetic. Key UI components include a company selector, an advanced filtering bar, sortable data tables, and modals for detailed views. Print functionality is implemented via server-rendered HTML opened in new browser tabs.

### Technical Implementations

**Authentication & Authorization:**
- Session-based authentication.
- Server-side authorization enforcing multi-company data isolation, restricting users to their assigned company data while superusers have full access.

**Multi-Company Support:**
- Data isolation is enforced at both the database and API levels, preventing cross-company data access. A client-side company selector manages the user's active context.

**Data Management:**
- Server-side search across multiple fields, advanced filtering with combined (AND) logic, server-side sorting, and pagination (10 items per page). Dynamic filter values are fetched from the server.

**Printing:**
- Both individual inspection reports and bulk lists are generated as server-rendered HTML and opened in new browser tabs for optimal printing via the browser's native print function (Ctrl+P/Cmd+P).

**Device Integration:**
- **STM32 Device Upload Endpoint:** POST /api/device/inspections accepts BRICKINSPECTION EDI format from simple devices (no authentication required for device uploads)
- **UUID-based Inspection IDs:** Devices generate UUIDs for inspections, not database auto-generation
- **UTC Timestamp Storage:** All timestamps stored in UTC with timezone offset/DST metadata for accurate reconstruction
- **Raw Data Storage:** All successful inspection uploads store the original raw BRICKINSPECTION EDI data in the inspections table for debugging and audit purposes
- **Comprehensive Error Logging:** Failed uploads logged to upload_errors table with raw payload and full stack traces
- **Device-Friendly Debugging:** HTTP responses include complete error stack traces for device integration troubleshooting
- **Duplicate Detection:** Rejects duplicate inspection IDs with 409 Conflict status

**Recent Improvements:**
- **Multi-Asset Inspection Support:** Implemented full support for inspections with multiple assets (e.g., tractor + dolly + trailer). Added `assetId` to defects table and `inspection_assets` junction table. All UI components now display multiple assets using chips/badges. Asset ID column added to all defect tables (InspectionModal, print reports) so users can identify which asset each defect belongs to. (2025-11-12)
- **Enhanced Filtering & Sorting:** Asset filters now query `inspection_assets` junction table to properly find multi-asset inspections. Defects page defaults to severity DESC → asset ASC → datetime ASC sorting (optimized for mechanics prioritizing severe defects). Asset sorting includes secondary sort by zone name alphabetically. (2025-11-12)
- **DOT Compliance Enhancements:** Added `dotNumber` field to companies and `licensePlate` field to assets for DOT compliance reporting. Print reports now display company address, DOT number, asset license plate, parsed inspection form data table, and inspection timestamps in defects table (replacing status column). Inspection detail dialog now filters out severity 0 defects and displays form data in a formatted table. (2025-11-12)
- **Raw Data Storage in Inspections:** Added `rawData` text column to inspections table to store original BRICKINSPECTION EDI data from device uploads for comprehensive debugging and audit trail (2025-11-12)
- **EDI Layout Management System:** Inspection types can now be associated with one or more EDI layouts stored as large text blobs. Special "all layouts" logic: when no specific associations exist (empty junction table), the inspection type applies to ALL layouts automatically. This allows dynamic layout additions without remapping existing inspection types.
- **Defects Page Smart Defaults:** Page loads with severity DESC sorting and status filter set to "open" for immediate focus on critical open issues.
- **Severity Filter with Ranges:** New dropdown filter with color-coded severity ranges - Critical (≥75), High (50-74), Medium (25-49), Low (0-24).
- **Form Field Length Input:** Converted from number input to plain text field with 0-64 validation, preventing spinner arrows and improving UX.
- **Database Constraints:** CHECK constraints prevent empty string surrogate IDs (user_id, asset_id, inspection_type_id, layout_id must not be empty/whitespace).
- **Asset Update Bug Fix:** PATCH /api/assets/:assetId now uses limit: 10000 to fetch all assets for authorization check, fixing 404 errors when updating assets beyond first pagination page.
- **Page Scrolling Fix:** Main container changed from overflow-hidden to overflow-auto, enabling proper scrolling on all pages and making content below the fold accessible.
- **Asset Filter SQL Bug Fix:** Fixed getInspections to use db.select().from(inspections) instead of db.query.inspections.findMany() to properly handle raw SQL EXISTS clauses for multi-asset inspection filtering. (2025-11-12)
- **Inspection Assets Junction Table:** Updated seed script to populate inspection_assets for ALL inspections (both single and multi-asset), not just multi-asset test data. This ensures asset filters show all assets and correctly find all inspections. (2025-11-12)
- **Removed Deprecated assetId Column:** Dropped the deprecated `asset_id` column from the inspections table. All asset associations now exclusively use the `inspection_assets` junction table, eliminating confusion and ensuring single source of truth for multi-asset support. (2025-11-12)
- **Severity 0 Filter:** Defects page now excludes severity = 0 entries (no-issue defects) from all queries and filter dropdowns. Backend storage layer enforces this filter automatically via `severity > 0` condition. (2025-11-12)
- **Print Report Defect Sorting:** Both single inspection and bulk list print reports now sort defects by asset ID (alphabetically) first, then by inspection time (chronologically). Also filters out severity = 0 defects from printed reports. (2025-11-12)
- **Defects Page Sorting Optimization:** Simplified Defects page sorting to severity DESC → inspectedAtUtc ASC for mechanics workflow (removed intermediate asset sorting). (2025-11-12)
- **Print Reports Driver Notes:** Added critical "Driver Notes" column to both single inspection and bulk list print reports, displaying driver observations for each defect. (2025-11-12)

### Database Schema

**Multi-Tenant ID Architecture:**
The system uses UUID surrogate primary keys with human-readable business IDs to support multiple companies using identical identifiers. This allows, for example, both NEC and WALMART to have a "pre-trip" inspection type without conflicts.

- **UUID Primary Keys:** All major entities (users, assets, inspection_types) use UUID `id` as the primary key
- **Business IDs:** Human-readable identifiers (userId, assetId, inspectionTypeId) are unique per company via `UNIQUE(company_id, business_id)` constraints
- **API Surface:** External APIs continue using business IDs; internal resolution to UUIDs is transparent
- **Foreign Keys:** All relationships use UUID foreign keys for referential integrity

**Tables:**
- **Companies:** `id` (PK), `name`, `address` (nullable), `dotNumber` (nullable)
- **Users:** `id` (UUID PK), `userId` (business ID, unique per company), `password`, `companyId` (FK), `UNIQUE(companyId, userId)`
- **Assets:** `id` (UUID PK), `assetId` (business ID, unique per company), `assetConfig`, `assetName`, `licensePlate` (nullable), `status`, `companyId` (FK), `UNIQUE(companyId, assetId)`
- **Inspection Types:** `id` (UUID PK), `inspectionTypeId` (business ID, unique per company), `status` (ACTIVE/INACTIVE), `companyId` (FK), `UNIQUE(companyId, inspectionTypeId)`
- **Inspection Type Form Fields:** `id` (UUID PK), `inspectionTypeId` (UUID FK → inspection_types.id), `formFieldName`, `formFieldType` (TEXT/NUM), `formFieldLength` (integer 0-64)
- **Layouts:** `id` (UUID PK), `layoutId` (business ID, unique per company), `layoutData` (large text blob), `companyId` (FK), `UNIQUE(companyId, layoutId)`
- **Inspection Type Layouts:** Junction table for many-to-many relationship between inspection types and layouts. `inspectionTypeId` (UUID FK → inspection_types.id), `layoutId` (UUID FK → layouts.id). Empty junction = "ALL LAYOUTS" logic.
- **Inspections:** `id` (UUID PK), `companyId` (FK), `datetime` (auto-populated by DB), `inspectionType` (text, not FK), `driverName`, `driverId`, `inspectionFormData`, `inspStartTimeUtc`, `inspSubmitTimeUtc`, `inspTimeOffset`, `inspTimeDst`, `rawData` (original BRICKINSPECTION EDI data)
  - Note: `inspectionType` is stored as text (not FK) to avoid stale data issues with permanent inspection records
  - Note: UTC timestamps with timezone metadata preserve device-local times for accurate reconstruction
  - Note: `rawData` stores the original EDI format data from device uploads for debugging and audit purposes
- **Inspection Assets:** Junction table for multi-asset inspections. `inspectionId` (UUID FK → inspections.id), `assetId` (text). Stores all assets associated with an inspection.
- **Defects:** `id` (UUID PK), `inspectionId` (UUID FK), `assetId` (text, identifies which asset this defect belongs to), `zoneId`, `zoneName`, `componentName`, `defect`, `severity`, `inspectedAtUtc`, `driverNotes`, `status`, `repairNotes`
- **Upload Errors:** `id` (UUID PK), `timestamp`, `companyId`, `driverId`, `driverName`, `assetId`, `rawData`, `errorTrace`
  - Logs all failed device upload attempts with full context for debugging

### API Endpoints
- **Authentication:** Login, Logout, Get current user.
- **Companies:** Get accessible companies.
- **Assets:** List (with search, filtering, sorting, pagination), Get filter values, Create, Update.
- **Layouts:** Get all layouts for a company.
- **Inspection Types:** List (with search, filtering, sorting, pagination), Get filter values, Get single inspection type, Create, Update.
- **Inspection Type Form Fields:** Get form fields for inspection type, Create, Update, Delete.
- **Inspections:** List (with extensive filtering, sorting, pagination), Get filter values, Print list, Get single inspection, Print single inspection, Create, Update, Delete.
- **Defects:** List (with search, filtering by date/asset/driver/zone/component/status, sorting, pagination), Get filter values, Get defects for an inspection, Create, Update, Delete.
- **Device Integration:** POST /api/device/inspections - Unauthenticated endpoint for STM32 devices to upload BRICKINSPECTION EDI format data.

### Key Files
- `shared/schema.ts`: Drizzle ORM schema, Zod validation, TypeScript types.
- `server/brickParser.ts`: BRICKINSPECTION EDI format parser with UTC timezone conversion.
- `server/brickParser.test.ts`: Comprehensive unit tests for EDI parser (11 tests).
- `server/`: Database setup, data access layer, API routes, seed data, Express server.
- `client/src/`: React components for authentication, company context, UI elements (FilterBar, InspectionModal, AssetModal, InspectionTypeModal), and pages (Login, Inspections, Defects, Users, Assets, InspectionTypes).

## External Dependencies

- **Database:** PostgreSQL (Neon-backed via Replit integration)
- **Frontend Framework:** React 18
- **Styling:** Tailwind CSS, Shadcn UI
- **ORM:** Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter (client), Express (server)
- **Validation:** Zod
- **Testing:** Playwright
- **Typography:** Inter (via Google Fonts)