# Inspection Brick

A professional web application for managing equipment and vehicle inspections with detailed defect tracking and reporting.

## Overview

Inspection Brick is a pilot project designed to help organizations manage Department of Transportation (DOT) vehicle inspections, equipment safety checks, and defect tracking. The application provides a clean, efficient interface for viewing inspection records, analyzing defects, and maintaining compliance.

## Project Status

**Last Updated:** October 22, 2025

### Completed Features (MVP v1.0)
- ✅ Complete database schema with PostgreSQL (inspections and defects tables)
- ✅ Full CRUD operations for inspections and defects
- ✅ Server-side search, sorting, and pagination
- ✅ Professional top navigation bar with logo and menu
- ✅ Inspections list page with:
  - Real-time search across all fields
  - Sortable columns (date/time, inspection type, asset ID, driver name)
  - Pagination controls (20 items per page)
  - Defect count display
- ✅ Inspection details modal with:
  - Complete inspection information
  - Defects table with severity indicators (0-100 scale)
  - Color-coded status badges (open/pending/repaired)
- ✅ Beautiful loading states and empty states
- ✅ Responsive design optimized for desktop
- ✅ End-to-end tested and verified

### Planned Future Features
- Defects/Repairs management screen
- Assets management (vehicles and equipment catalog)
- User management with role-based access
- Inspection Types configuration (custom checklist templates)
- Defect photo uploads
- Dashboard with statistics and trends
- Export functionality (PDF/CSV reports)

## Technical Architecture

### Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI components
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL (Neon-backed)
- **ORM:** Drizzle ORM
- **State Management:** TanStack Query v5
- **Routing:** Wouter

### Database Schema

**Inspections Table:**
- `id`: UUID (primary key, auto-generated)
- `datetime`: timestamp (defaults to current time)
- `inspectionType`: text (e.g., "DOT Vehicle Inspection")
- `assetId`: text (vehicle/equipment identifier)
- `driverName`: text
- `driverId`: text
- `inspectionFormData`: text (optional notes/data blob)

**Defects Table:**
- `id`: UUID (primary key, auto-generated)
- `inspectionId`: UUID (foreign key, cascade delete)
- `zoneName`: text (e.g., "Front End", "Hydraulics")
- `componentName`: text (e.g., "Left Headlight", "Brake Light")
- `defect`: text (description of the defect)
- `severity`: integer (0-100 scale)
- `driverNotes`: text (optional)
- `status`: enum ("open", "pending", "repaired")
- `repairNotes`: text (optional)

### API Endpoints

**Inspections:**
- `GET /api/inspections` - List with search, sort, pagination (query params: search, sortField, sortDirection, page, limit)
- `GET /api/inspections/:id` - Get single inspection with defects
- `POST /api/inspections` - Create new inspection
- `PATCH /api/inspections/:id` - Update inspection
- `DELETE /api/inspections/:id` - Delete inspection

**Defects:**
- `GET /api/inspections/:id/defects` - Get defects for an inspection
- `POST /api/defects` - Create new defect
- `PATCH /api/defects/:id` - Update defect
- `DELETE /api/defects/:id` - Delete defect

### Key Files

**Schema & Types:**
- `shared/schema.ts` - Drizzle ORM schema, Zod validation, TypeScript types

**Backend:**
- `server/db.ts` - Database connection setup
- `server/storage.ts` - Data access layer (IStorage interface, DatabaseStorage implementation)
- `server/routes.ts` - API route definitions with validation
- `server/seed.ts` - Sample data seeder

**Frontend:**
- `client/src/App.tsx` - Main app component with routing
- `client/src/components/TopBar.tsx` - Navigation header
- `client/src/components/InspectionModal.tsx` - Inspection details modal
- `client/src/components/StatusBadge.tsx` - Defect status indicator
- `client/src/components/SeverityIndicator.tsx` - Severity visualization
- `client/src/pages/Inspections.tsx` - Main inspections list page
- `client/src/pages/ComingSoon.tsx` - Placeholder for future pages

**Configuration:**
- `design_guidelines.md` - Comprehensive design system documentation
- `tailwind.config.ts` - Tailwind CSS configuration with design tokens
- `client/index.html` - HTML shell with SEO meta tags

## Design System

### Colors (Light Mode)
- **Primary:** Blue (hsl(220, 70%, 50%)) - Actions, links
- **Background:** White (hsl(0, 0%, 100%))
- **Card/Surface:** Light gray (hsl(220, 14%, 96%))
- **Border:** Subtle gray (hsl(220, 13%, 91%))
- **Text Primary:** Near-black (hsl(220, 9%, 15%))
- **Text Secondary:** Gray (hsl(220, 9%, 46%))

### Status Colors
- **Success/Repaired:** Green (hsl(142, 71%, 45%))
- **Warning/Pending:** Orange (hsl(38, 92%, 50%))
- **Error/Open:** Red (hsl(0, 84%, 60%))

### Typography
- **Font:** Inter (via Google Fonts)
- **Heading 1:** text-2xl font-semibold
- **Heading 2:** text-xl font-semibold
- **Body:** text-sm
- **Labels:** text-xs font-medium uppercase
- **Monospace:** font-mono (for IDs, timestamps)

## Development

### Running the Application
```bash
npm run dev
```
Starts the Express server (backend) and Vite dev server (frontend) on port 5000.

### Database Commands
```bash
# Push schema changes to database
npm run db:push

# Force push (if needed)
npm run db:push --force

# Seed with sample data
npx tsx server/seed.ts
```

### Testing
The application has been end-to-end tested with Playwright covering:
- Navigation and page rendering
- Search functionality
- Sorting and pagination
- Modal interactions
- Data display accuracy

## User Preferences

### Design Approach
- Information-dense, professional enterprise tool
- Clean, efficient workflows with minimal friction
- Consistent spacing and visual hierarchy
- Subtle hover interactions (no heavy animations)
- Data clarity over decorative elements

### Code Style
- TypeScript strict mode
- Functional React components with hooks
- Zod for runtime validation
- TanStack Query for server state
- data-testid attributes on all interactive elements

## Known Considerations

1. **Pagination:** Currently set to 20 items per page; can be adjusted in `client/src/pages/Inspections.tsx`
2. **Search:** Searches across inspection type, asset ID, driver name, and driver ID (not UUID)
3. **Mobile:** Optimized for desktop; mobile responsive design can be enhanced in future iterations
4. **Real-time:** No WebSocket/real-time updates; uses polling via TanStack Query
5. **Auth:** No authentication yet; planned for future with user management

## Deployment

The application is ready for pilot deployment. Use Replit's built-in publishing feature to make it accessible with a live URL.

## Support & Maintenance

For questions or issues during the pilot:
- Check browser console for any errors
- Verify database connection via environment variables
- Review `/tmp/logs/` for server-side errors
- Seed database if testing with fresh data: `npx tsx server/seed.ts`
