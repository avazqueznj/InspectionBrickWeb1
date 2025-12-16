# Inspection Brick

## Overview
Inspection Brick is a professional web application designed for managing equipment and vehicle inspections, with a strong focus on Department of Transportation (DOT) compliance. It provides two main user workflows: real-time defect monitoring for mechanics to minimize vehicle downtime, and comprehensive inspection management for supervisors to review history, analyze trends, and generate compliance reports. The system supports multi-company data isolation and features like advanced filtering, server-side pagination, and native browser printing for reports. The business vision is to provide a robust, efficient, and compliance-driven solution for industrial and transportation sectors.

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
- TanStack Query for server state (NO caching - staleTime: 0, gcTime: 0)
- data-testid attributes on all interactive elements

### Important User Requirements
- **NO PDFs ever** - Use browser's native print (Ctrl+P/Cmd+P) instead
- **NO complex test scripts** - Keep testing simple and manual
- **Simple solutions preferred** - Avoid over-engineering with unnecessary libraries
- **NO caching** - All data fetched fresh from database (React Query: staleTime: 0, gcTime: 0)
- **Analytics dashboards exception** - Analytics queries use 5-minute staleTime for performance
- **Print reports:** Server-rendered HTML in new browser tabs for optimal print formatting

## System Architecture

The application utilizes a client-server architecture with a professional, enterprise aesthetic.

### Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter (frontend), Express (backend)
- **Validation:** Zod

### UI/UX Decisions
The UI features a dark industrial theme with orange (#FF5722) accents. Key elements include a company selector, advanced filtering, sortable data tables, and modals for detailed views. Print functionality relies on server-rendered HTML for optimal native browser printing.

### Technical Implementations

**Authentication & Authorization:**
- JWT-based authentication with RS256 signing.
- Access tokens expire in 24 hours (no refresh tokens).
- Device tokens have a 10-year expiration for perpetual, company-scoped access.
- Supports Company Code Login, allowing users to authenticate with `(userId, companyId, password)`. Superusers have `companyId = null`.
- Web access control via a `webAccess` boolean flag on user accounts.
- Three-tier permission system: Superusers, Customer Admins, and Regular Users, enforced both server-side and client-side.
- Customer Admin toggle: Superusers can grant/revoke customerAdminAccess via a switch in the Users table.
- Rate limiting and audit logging for failed login attempts.
- All data access is company-scoped, verified via JWT payload.

**Multi-Company Support:**
- Data isolation enforced at database and API levels, with a client-side company selector.

**Data Management:**
- Server-side search, advanced filtering (AND logic), sorting, and pagination (10 items per page). Dynamic filter values are server-fetched.

**Printing:**
- Both individual inspection reports and bulk lists are generated as server-rendered HTML for native browser printing.

**Device Integration:**
- Dedicated `POST /api/device/inspections` endpoint for BRICKINSPECTION EDI format uploads using device tokens.
- `GET /api/device/config` endpoint provides BRICKCONFIG EDI format for device initialization, including company-scoped assets, layouts, inspection types, and users.
- Device tokens are 10-year JWTs.
- Company ID validation prevents cross-tenant data injection.
- BRICKCONFIG format includes ASSETS, LAYOUTS (with zones/components/defects), INSPTYPES, and USERS.
- Uses UUID-based inspection IDs and UTC timestamps.
- Raw BRICKINSPECTION EDI data is stored for debugging.
- Comprehensive error logging and duplicate detection for inspection uploads.

**Analytics Dashboards:**
- Collapsible statistics panels on Inspections and Defects pages showing key metrics
- Inspections page: Top assets with defects, users by inspection count, components with most defects, defects by severity
- Defects page: Assets with most defects, components with most defects, defects by status, zones with most defects
- Uses Recharts for bar chart visualizations
- Data cached for 5 minutes with manual refresh option (only exception to no-caching rule)
- Collapsed state persisted in localStorage per page

**Core Concepts:**
- **Defects Table:** Records represent inspection checks. Severity 0 means no defect (audit trail), 1-10 are actual defects (needs repair). Defects are sorted by severity (DESC) then time (DESC) for real-time monitoring.
- **Layout Builder:** A visual UI for configuring inspection layouts with a hierarchical structure (Layout → Zone → Component → Defect). Supports full CRUD operations, inline editing, and severity configuration. Includes optional zone images (JPEG, max 800x400px) and seed data for common vehicle types. Zone deletion triggers cascade cleanup of associated images in application layer.
- **Layout Activation:** Layouts have an `isActive` boolean field (default: false). Only active layouts are sent to devices via the config endpoint. Activation requires validation: layout must have at least one zone, each zone must have at least one component, and each component must have at least one defect. All names must be non-empty. Toggle UI shows green power icon for active layouts with validation feedback on errors.
- **Admin Tools:** Superuser-only features including database reseed functionality and a device config preview tool.

**Locations Feature:**
- Locations represent organizational hierarchy with geographical coordinates for large customers
- **Locations are mandatory** - users and assets must have locationId (NOT NULL FK with onDelete: "restrict")
- Location dropdown is required in User and Asset creation/edit forms
- Locations are company-scoped with CRUD management page at /locations
- Simple locations endpoint `/api/locations/simple?companyId=X` for dropdown population

**Inspection Location Capture:**
- Inspections table has nullable locationId (UUID) and locationName (text) fields - NO FK constraints (preserves historical data)
- When inspections are uploaded, system looks up driver's locationId from users table and denormalizes to inspection
- JWT tokens include locationId for the authenticated user
- Inspections page: Location column displayed, location filter dropdown, defaults to user's location
- Print reports include location information

### Database Schema
- **Multi-Tenant ID Architecture:** Uses UUID primary keys and human-readable business IDs unique per company.
- **Business Key Naming Convention:** Noun-based (e.g., `inspectionTypeName`), immutable, and unique within company scope.
- **Core Tables:** Companies, Users, Assets, Locations, Inspection Types, Layouts, Inspections, Defects, Upload Errors, with appropriate junction tables and `CHECK` constraints. Includes `dotNumber` for companies and `licensePlate` for assets.
- **Locations Constraint:** locationId is NOT NULL on both users and assets tables with FK onDelete: "restrict" to prevent deleting locations that have users/assets assigned.

### API Endpoints
Endpoints exist for authentication, managing companies, assets, layouts, inspection types, inspections, defects, and device integration.

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