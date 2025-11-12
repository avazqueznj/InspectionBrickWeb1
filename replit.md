# Inspection Brick

## Overview
Inspection Brick is a professional web application for managing equipment and vehicle inspections, focusing on Department of Transportation (DOT) compliance. It offers a clean, efficient interface for viewing records, analyzing defects, and generating reports. Key features include multi-company data isolation, real-time search and filtering, detailed defect tracking with severity levels, and server-side pagination. The project aims to enhance operational efficiency, streamline inspection processes, and ensure regulatory compliance for organizations.

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

The application utilizes a client-server architecture.

### Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter (frontend), Express (backend)
- **Validation:** Zod

### UI/UX Decisions
The UI features a dark industrial theme with orange (#FF5722) accents, emphasizing a professional, enterprise aesthetic. It includes a company selector, advanced filtering, sortable data tables, and modals for detailed views. Print functionality is handled via server-rendered HTML in new browser tabs.

### Technical Implementations

**Authentication & Authorization:**
- Session-based authentication with server-side authorization enforcing multi-company data isolation.

**Multi-Company Support:**
- Data isolation is enforced at database and API levels, with a client-side company selector managing context.

**Data Management:**
- Server-side search, advanced filtering (AND logic), sorting, and pagination (10 items per page). Dynamic filter values are fetched from the server.

**Printing:**
- Both individual inspection reports and bulk lists are generated as server-rendered HTML for native browser printing.

**Device Integration:**
- **STM32 Device Upload Endpoint:** `POST /api/device/inspections` for BRICKINSPECTION EDI format (unauthenticated).
- **UUID-based Inspection IDs:** Devices generate UUIDs for inspections.
- **UTC Timestamp Storage:** All timestamps stored in UTC with offset/DST metadata.
- **Raw Data Storage:** Original BRICKINSPECTION EDI data is stored for debugging and audit.
- **Comprehensive Error Logging:** Failed uploads are logged with raw payload and stack traces.
- **Duplicate Detection:** Rejects duplicate inspection IDs with a 409 Conflict status.

**Key Features:**
- **Multi-Asset Inspection Support:** Full support for inspections involving multiple assets, with `assetId` in defects and an `inspection_assets` junction table.
- **DOT Compliance:** Includes `dotNumber` for companies and `licensePlate` for assets, displayed in print reports.
- **EDI Layout Management:** Inspection types can be associated with EDI layouts stored as text blobs, supporting dynamic layout additions.
- **Defects vs. Checks:** Severity = 0 records are inspection CHECKS (components inspected with no issues), not actual defects. Preserved in database for audit trail. Defect counts show only severity > 0 (actual defects needing repair).
- **Defects Page Optimization:** Defaults to severity DESC → inspectedAtUtc DESC sorting (high severity first, then newest first), and filters out severity 0 defects (shows only actual defects for repairs).
- **Severity Filter:** New dropdown filter with color-coded severity ranges (Critical, High, Medium, Low).
- **"View Inspection" Button:** Allows viewing parent inspection from the Defects page, showing full context including all associated defects.
- **Database Constraints:** Utilizes `CHECK` constraints for non-empty surrogate IDs.

### Database Schema

**Multi-Tenant ID Architecture:**
Uses UUID primary keys and human-readable business IDs unique per company, allowing multiple companies to use identical business IDs without conflict. Foreign keys use UUIDs.

**Core Tables:**
- **Companies:** Stores company details, including `dotNumber`.
- **Users:** User authentication and company association.
- **Assets:** Equipment/vehicle details, including `licensePlate`.
- **Inspection Types:** Defines types of inspections.
- **Inspection Type Form Fields:** Configures form fields for inspection types.
- **Layouts:** Stores EDI layout data.
- **Inspection Type Layouts:** Junction table for inspection type-layout relationships.
- **Inspections:** Stores inspection records, including `rawData` for EDI.
- **Inspection Assets:** Junction table for multi-asset inspections.
- **Defects:** Stores detailed defect information, including `assetId` and `driverNotes`.
- **Upload Errors:** Logs failed device upload attempts.

### API Endpoints
Provides endpoints for authentication, managing companies, assets, layouts, inspection types, inspections, defects, and an unauthenticated device integration endpoint for inspection uploads.

## External Dependencies

- **Database:** PostgreSQL (Neon-backed)
- **Frontend Framework:** React 18
- **Styling:** Tailwind CSS, Shadcn UI
- **ORM:** Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter (client), Express (server)
- **Validation:** Zod
- **Testing:** Playwright
- **Typography:** Inter (Google Fonts)