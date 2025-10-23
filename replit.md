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

### Database Schema

**Multi-Tenant ID Architecture:**
The system uses UUID surrogate primary keys with human-readable business IDs to support multiple companies using identical identifiers. This allows, for example, both NEC and WALMART to have a "pre-trip" inspection type without conflicts.

- **UUID Primary Keys:** All major entities (users, assets, inspection_types) use UUID `id` as the primary key
- **Business IDs:** Human-readable identifiers (userId, assetId, inspectionTypeId) are unique per company via `UNIQUE(company_id, business_id)` constraints
- **API Surface:** External APIs continue using business IDs; internal resolution to UUIDs is transparent
- **Foreign Keys:** All relationships use UUID foreign keys for referential integrity

**Tables:**
- **Companies:** `id` (PK), `name`
- **Users:** `id` (UUID PK), `userId` (business ID, unique per company), `password`, `companyId` (FK), `UNIQUE(companyId, userId)`
- **Assets:** `id` (UUID PK), `assetId` (business ID, unique per company), `assetConfig`, `assetName`, `status`, `companyId` (FK), `UNIQUE(companyId, assetId)`
- **Inspection Types:** `id` (UUID PK), `inspectionTypeId` (business ID, unique per company), `inspectionLayout`, `status` (ACTIVE/INACTIVE), `companyId` (FK), `UNIQUE(companyId, inspectionTypeId)`
- **Inspection Type Form Fields:** `id` (UUID PK), `inspectionTypeId` (UUID FK → inspection_types.id), `formFieldName`, `formFieldType` (TEXT/NUM), `formFieldLength` (integer 0-64)
- **Inspections:** `id` (UUID PK), `companyId` (FK), `datetime`, `inspectionType` (text, not FK), `assetId` (text, not FK), `driverName`, `driverId`, `inspectionFormData`
  - Note: `assetId` and `inspectionType` are stored as text (not FKs) to avoid stale data issues with permanent inspection records
- **Defects:** `id` (UUID PK), `inspectionId` (UUID FK), `zoneName`, `componentName`, `defect`, `severity`, `driverNotes`, `status`, `repairNotes`

### API Endpoints
- **Authentication:** Login, Logout, Get current user.
- **Companies:** Get accessible companies.
- **Assets:** List (with search, filtering, sorting, pagination), Get filter values, Create, Update.
- **Inspection Types:** List (with search, filtering, sorting, pagination), Get filter values, Get single inspection type, Create, Update.
- **Inspection Type Form Fields:** Get form fields for inspection type, Create, Update, Delete.
- **Inspections:** List (with extensive filtering, sorting, pagination), Get filter values, Print list, Get single inspection, Print single inspection, Create, Update, Delete.
- **Defects:** Get defects for an inspection, Create, Update, Delete.

### Key Files
- `shared/schema.ts`: Drizzle ORM schema, Zod validation, TypeScript types.
- `server/`: Database setup, data access layer, API routes, seed data, Express server.
- `client/src/`: React components for authentication, company context, UI elements (FilterBar, InspectionModal, AssetModal, InspectionTypeModal), and pages (Login, Inspections, Users, Assets, InspectionTypes).

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