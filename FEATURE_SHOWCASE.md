# Inspection Brick
## Enterprise Fleet Inspection & DOT Compliance Platform

---

# Executive Summary

**Inspection Brick** is an enterprise-grade inspection management platform purpose-built for transportation and industrial fleets. It transforms paper-based DOT compliance workflows into a streamlined digital ecosystem that reduces vehicle downtime, eliminates compliance gaps, and provides real-time visibility into fleet safety status.

**Key Value Proposition:** Reduce FMCSA audit risk, minimize repair turnaround time, and achieve 100% DVIR compliance with zero paper.

---

# Core Platform Capabilities

## 1. Real-Time Defect Monitoring & Repair Management

### The Problem
Traditional inspection workflows create dangerous delays between defect discovery and repair. Paper-based systems lose critical information, mechanics work from incomplete data, and supervisors lack visibility into repair status.

### Our Solution

| Feature | Description | Business Impact |
|---------|-------------|-----------------|
| **Live Defect Dashboard** | Priority-sorted defect queue with severity indicators (Critical 8-10, High 6-7, Medium 3-5, Low 1-2) | Mechanics address highest-priority issues first, reducing out-of-service events |
| **Batch Repair Processing** | Select multiple defects and mark repaired in a single action with mechanic name, repair notes, and timestamp | 70% faster repair documentation vs. individual entry |
| **Severity-Based Triage** | Defects automatically sorted by severity (DESC) then time (DESC) for real-time monitoring | Critical safety issues never buried under routine findings |
| **Complete Audit Trail** | Severity 0 entries preserved as "no defect found" records for regulatory proof | Demonstrates inspection diligence during FMCSA audits |

### Defect Lifecycle States
- **Open** - Newly reported, awaiting repair
- **Pending** - Repair scheduled or in progress
- **Repaired** - Work completed with documentation
- **Not Needed** - False positive or resolved without repair

---

## 2. DOT/FMCSA Compliance Engine

### Regulatory Alignment

Inspection Brick is engineered for **49 CFR Part 396** compliance, the FMCSA regulation governing inspection, repair, and maintenance of commercial motor vehicles.

| Regulation | Requirement | How Inspection Brick Addresses |
|------------|-------------|-------------------------------|
| **49 CFR 396.11** | Daily Vehicle Inspection Reports (DVIRs) | Digital DVIR capture with driver signature, timestamp, and defect documentation |
| **49 CFR 396.3** | 3-month DVIR retention | Automatic retention with unlimited cloud storage, instant retrieval for audits |
| **49 CFR 396.17** | Annual periodic inspections | Configurable inspection types for annual, quarterly, and custom schedules |
| **49 CFR 396.19** | Inspector qualification records | User management with qualification tracking and access controls |

### Company DOT Number Tracking
Each company profile stores the official **USDOT Number** for accurate regulatory identification and audit preparation.

### Penalty Avoidance
2025 FMCSA penalties for recordkeeping violations reach **$1,584/day** (cumulative max $15,846). Out-of-service violations can reach **$33,252** for failure to cease operations. Inspection Brick provides the documentation backbone to defend against these penalties.

---

## 3. Multi-Tenant Enterprise Architecture

### Complete Data Isolation

| Capability | Description |
|------------|-------------|
| **Company-Scoped Data** | Every query, every API call, every report enforces company boundaries at the database level |
| **Cross-Tenant Protection** | JWT tokens embed company ID claims; server-side validation prevents data leakage |
| **Unified Administration** | Superusers manage all tenants from single interface; company users see only their data |

### Ideal For
- **Fleet Management Companies** managing multiple carrier clients
- **Enterprise Corporations** with distinct operating divisions
- **Franchise Operations** requiring brand-level data separation

---

## 4. Configurable Inspection Framework

### Visual Layout Builder

Create inspection templates that match your exact operational requirements:

```
Layout (e.g., "Class 8 Tractor")
  Zone (e.g., "Engine Compartment")
     Component (e.g., "Oil Filter")
        Defect (e.g., "Leak Detected", Max Severity: 8)
        Defect (e.g., "Filter Clogged", Max Severity: 6)
     Component (e.g., "Belts & Hoses")
        Defect (e.g., "Belt Cracked", Max Severity: 7)
        Defect (e.g., "Hose Leak", Max Severity: 9)
  Zone (e.g., "Cab Interior")
     ...
```

### Layout Features

| Feature | Description |
|---------|-------------|
| **Hierarchical Structure** | Layout > Zone > Component > Defect with unlimited nesting |
| **Severity Configuration** | Each defect type has a max severity (1-10) for consistent classification |
| **Zone Documentation Images** | Upload JPEG images (max 800x400px) to guide inspectors visually |
| **Activation Validation** | Layouts must pass completeness validation before device deployment |
| **Seed Data Templates** | Pre-built layouts for common vehicle types (tractors, trailers, vans, forklifts) |

### Inspection Types

Flexible inspection scheduling configurations:
- Pre-trip / Post-trip DVIRs
- Annual DOT inspections
- Quarterly brake inspections
- Monthly safety checks
- Custom inspection schedules

Each inspection type includes:
- Associated layouts (which assets get which inspection)
- Custom form fields (mileage, hours, fuel level, etc.)
- Active/Inactive status for lifecycle management

---

## 5. Rugged Device Integration

### Purpose-Built for Field Operations

Inspection Brick supports **STM32-based inspection devices** designed for harsh industrial environments:

| Specification | Detail |
|---------------|--------|
| **Data Format** | BRICKINSPECTION EDI for compact, reliable transmission |
| **Authentication** | 10-year device tokens (JWT) for set-and-forget deployment |
| **Configuration Sync** | BRICKCONFIG EDI pushes assets, layouts, users, and inspection types to devices |
| **Offline Capable** | Devices operate independently; sync when connectivity available |
| **Image Support** | Zone images rendered via TJpg_Decoder library for visual inspection guidance |

### Device Configuration Content (BRICKCONFIG)
```
ASSETS     - All active assets assigned to this company
LAYOUTS    - Complete zone/component/defect hierarchies
INSPTYPES  - Inspection types with form field definitions
USERS      - Driver/inspector roster for authentication
```

### Security Model
- Device tokens are company-scoped and cannot access other tenants
- Company ID validation on every upload prevents cross-tenant injection
- Raw EDI data stored for debugging and audit purposes
- Comprehensive error logging for failed upload attempts

---

## 6. Analytics & Business Intelligence

### Collapsible Statistics Dashboards

Both Inspections and Defects pages feature built-in analytics panels:

#### Inspections Analytics
| Metric | Insight |
|--------|---------|
| Top Assets with Defects | Identify problem vehicles requiring attention |
| Users by Inspection Count | Monitor inspector productivity |
| Components with Most Defects | Spot systemic maintenance issues |
| Defects by Severity | Understand fleet risk profile |

#### Defects Analytics
| Metric | Insight |
|--------|---------|
| Assets with Most Defects | Prioritize vehicle replacement/overhaul |
| Components with Most Defects | Target preventive maintenance programs |
| Defects by Status | Track repair backlog and completion rates |
| Zones with Most Defects | Identify inspection focus areas |

### Visualization
- **Recharts bar graphs** for clear data presentation
- **5-minute cache** for dashboard performance (only exception to real-time data policy)
- **Manual refresh** button for on-demand updates
- **Persistent collapse state** remembers user preferences

---

## 7. Professional Reporting & Print

### Native Browser Printing

Inspection Brick takes a deliberate anti-PDF approach:

| Traditional PDF | Inspection Brick Approach |
|-----------------|---------------------------|
| Requires PDF generation libraries | Server-rendered HTML optimized for print |
| Complex viewer dependencies | Native browser Ctrl+P / Cmd+P |
| Version compatibility issues | Works on any modern browser |
| Mobile viewing problems | Responsive print stylesheets |

### Available Reports
- **Individual Inspection Reports** - Complete inspection detail with all defects, driver info, timestamps
- **Bulk Inspection Lists** - Multi-inspection summaries for period reviews
- **Defect Reports** - Repair documentation with mechanic sign-off

### Report Content
Each inspection report includes:
- Company information with DOT number
- Asset identification and license plate
- Driver/inspector details
- Inspection timestamp with timezone
- Complete defect listing with severity indicators
- Repair status and mechanic notes
- Form field data (mileage, hours, etc.)

---

## 8. Enterprise Security & Access Control

### Three-Tier Permission System

| Role | Capabilities |
|------|--------------|
| **Superuser** | Full platform administration, cross-company access, user management, database tools, device token generation |
| **Customer Admin** | Company-level administration, layout management, inspection type configuration, user management within company |
| **Regular User** | Inspection viewing, defect management, asset lookup, report generation |

### Authentication Architecture

| Feature | Implementation |
|---------|----------------|
| **Algorithm** | RS256 (RSA + SHA-256) asymmetric signing |
| **Access Tokens** | 24-hour expiration for web sessions |
| **Device Tokens** | 10-year expiration for field equipment |
| **Session Model** | Pure stateless JWT - no server-side sessions |
| **Token Storage** | Secure browser localStorage with automatic logout |

### Security Features
- **Company Code Login** - Users authenticate with (userId, companyId, password)
- **Web Access Control** - Boolean flag enables/disables web portal access per user
- **Rate Limiting** - Protection against brute-force authentication attempts
- **Audit Logging** - Failed login attempts recorded for security monitoring
- **Company-Scoped Validation** - Every API request validated against JWT company claim

---

## 9. Advanced Data Management

### Server-Side Processing

All data operations execute server-side for performance at scale:

| Feature | Description |
|---------|-------------|
| **Full-Text Search** | Fast search across inspection IDs, asset IDs, driver names |
| **Advanced Filtering** | Multi-criteria AND logic filtering with dynamic filter values |
| **Column Sorting** | Click-to-sort on any column with ASC/DESC toggle |
| **Pagination** | 10 items per page with server-side offset/limit |

### Real-Time Data Policy
- **Zero caching** by default - every query fetches fresh data
- No stale inspection data or outdated defect status
- Analytics dashboards are the only exception (5-minute cache for performance)

### Asset Management

| Field | Purpose |
|-------|---------|
| Asset ID | Business identifier (e.g., "TRUCK-5503") |
| Asset Name | Descriptive name |
| Layout Assignment | Which inspection template applies |
| License Plate | DOT identification |
| Status | Active/Inactive for lifecycle management |

---

## 10. Administration Tools

### Superuser Capabilities

| Tool | Function |
|------|----------|
| **Device Token Generator** | Create 10-year tokens for field device deployment |
| **Config Preview** | View BRICKCONFIG output before device sync |
| **Zone Image Upload** | Manage visual documentation for inspection zones |
| **Database Reseed** | Development/testing environment refresh |

### User Administration

| Capability | Description |
|------------|-------------|
| **Create/Edit Users** | Full user lifecycle management |
| **Customer Admin Toggle** | Superusers grant/revoke admin access via simple switch |
| **Status Management** | Activate/deactivate users without deletion |
| **Company Assignment** | Assign users to specific tenant companies |

---

# Technical Specifications

## Architecture Overview

```
Client Layer        API Layer           Data Layer
-----------        ---------           ----------
React 18     <-->  Express.js    <-->  PostgreSQL
TypeScript         Node.js             Drizzle ORM
Tailwind CSS       JWT Auth            Neon (Cloud)
Shadcn UI          REST API            
TanStack Query     Zod Validation
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Shadcn UI |
| State Management | TanStack Query v5 |
| Routing | Wouter (client), Express (server) |
| Backend | Express.js on Node.js |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM with Zod validation |
| Authentication | Pure JWT with RS256 signing |
| Testing | Playwright end-to-end |

## Database Schema Highlights

| Table | Purpose |
|-------|---------|
| companies | Multi-tenant company profiles with DOT numbers |
| users | User accounts with role and access flags |
| assets | Fleet assets with layout assignments |
| inspections | Completed inspection records |
| defects | Individual defect/check records with repair tracking |
| layouts | Inspection template definitions |
| layout_zones | Zone hierarchy within layouts |
| layout_zone_components | Component hierarchy within zones |
| component_defects | Defect types with severity configuration |
| inspection_types | Inspection schedule configurations |
| zone_images | Binary JPEG storage for zone documentation |
| upload_errors | Device upload failure logging |

---

# Deployment & Integration

## Cloud-Native Deployment
- Serverless PostgreSQL for automatic scaling
- Stateless architecture for horizontal scaling
- No session storage requirements

## Integration Points
- RESTful API for all operations
- EDI format support for legacy device integration
- JWT-based authentication for third-party integrations

---

# Why Inspection Brick?

## For Fleet Managers
- Eliminate paper DVIRs and compliance gaps
- Real-time visibility into fleet safety status
- Audit-ready documentation always available

## For Mechanics
- Priority-sorted work queue
- Batch repair processing
- Complete defect context at a glance

## For Safety Directors
- Trend analysis and pattern detection
- Proactive maintenance planning
- FMCSA audit confidence

## For IT Leaders
- Modern cloud architecture
- Zero server-side session management
- Multi-tenant data isolation by design

---

# Contact

**Ready to transform your fleet inspection operations?**

Inspection Brick delivers enterprise-grade DOT compliance without enterprise complexity.

---

*Inspection Brick - Built for the road. Engineered for compliance.*
