# Inspection Brick

> End-to-end DOT inspection management — from custom-built field hardware to a cloud-connected operations dashboard  
> **Author:** Alejandro Vazquez  
> **First commit:** October 21, 2025

---

## What Is Inspection Brick?

Inspection Brick is a full-stack inspection management system built for industrial and transportation operations that require DOT compliance. It connects purpose-built handheld inspection devices to a web platform where supervisors can track defects, manage repairs, and maintain a complete, auditable inspection record.

The system is designed around two core workflows:

- **In the field** — Drivers and inspectors use ruggedized handheld devices to conduct pre-trip/post-trip and equipment inspections, logging defects with photos and notes. Devices sync inspection data over Wi-Fi when back in range.
- **In the office** — Supervisors and mechanics use the web dashboard to monitor open defects in real time, assign repairs, track compliance status, and print DOT-compliant inspection reports.

The platform supports multiple companies with strict data isolation, role-based access, and location-aware filtering — designed to scale from a single yard to a distributed fleet operation.

---

## The Hardware

Inspection Brick devices are custom-built handheld units built around Arduino hardware, housed in ruggedized enclosures with touchscreens. Each device runs the Inspection Brick firmware and communicates with the cloud backend using a structured EDI format over Wi-Fi.

### Device Family

![Three Inspection Brick devices showing different UI screens](img-devices-overview.jpg)

*Three generations of Inspection Brick devices. From top: the settings/provisioning screen, the inspection history list, and the main menu with Check/Inspect, History, and Sync options.*

---

### Inside the Device

![Open Inspection Brick device showing Arduino internals](img-device-internals.jpg)

*The interior of an Inspection Brick unit. Built around an Arduino MEGA with a Wi-Fi shield, camera module, RTC, CR2032 backup battery, and voltage sensor — all hand-wired into a ruggedized enclosure.*

---

### Charging & Connectivity

![Inspection Brick device charging via USB with status LEDs visible](img-device-charging.jpg)

*A device charging via USB. The status LEDs indicate power and connectivity state. The rear edge exposes the USB port and additional connectors.*

---

### Syncing with the Server

![Device showing successful sync confirmation screen](img-device-sync.jpg)

*A successful sync: the device confirms it received 3 assets, 4 layouts, 5 inspection types, and 2 users from the server, with no pending inspections to upload. Sync downloads the latest configuration and uploads any queued inspections.*

---

### Inspection History on Device

![Device showing inspection history list](img-device-history.jpg)

*The inspection history screen on a device, listing recent inspections by ID, timestamp, and inspector. Inspectors can review past submissions directly on the device before syncing.*

---

## The Web Platform

### Inspections Dashboard

![Inspections list page showing sortable table with filters](img-inspections-list.png)

*The Inspections page — the central record of all uploaded inspections. Supervisors can search and filter by date range, inspection type, asset, driver, and location. Each row links to a full printable report. The orange "Print List" button generates a formatted page for native browser printing — no PDFs required.*

---

### Defects & Repairs Dashboard

![Defects and Repairs page with analytics dashboard showing donut charts and bar charts](img-defects-dashboard.png)

*The Defects/Repairs page gives mechanics and supervisors a real-time view of open defects across the fleet. The analytics panel shows defect counts by status (Open / Pending / Repaired) and severity (Critical / High / Medium / Low), plus top assets and zones by defect volume. Mechanics can batch-mark defects as repaired directly from this view.*

---

### Configurable Inspection Layouts

One of the most important parts of the system is the Layout Builder — the tool that controls exactly what gets inspected on every asset type.

Supervisors build inspection layouts in the web app, and those layouts are automatically delivered to devices on their next sync. No firmware updates, no manual configuration on the device — just build the layout in the browser, activate it, and it's live.

![Layout Builder showing the TRAILER layout with Brake System zone expanded](img-layout-builder.png)

*The Layout Builder for the TRAILER layout. The left panel lists all configured layouts — active ones (SCHOOL-BUS, TRAILER, TRUCK, VAN) show a green power icon; inactive ones are grayed out. The right panel shows the zone editor for the selected layout. Here, the "Brake System" zone is expanded, showing a reference photo (used to help drivers identify the area on the vehicle), two components (Brake Adjustment and Brake Hoses), and an "Add Component" button. Additional zones — Coupling and Exterior Inspection — are visible below and can be expanded independently.*

#### How Layouts Are Structured

Layouts follow a strict hierarchy, each level configurable from the web app:

```
Layout  (e.g., "TRAILER")
└── Zone  (e.g., "Brake System", "Coupling", "Exterior Inspection")
    ├── Zone Reference Image  (optional JPEG shown on device during inspection)
    └── Component  (e.g., "Brake Adjustment", "Brake Hoses")
        └── Defect  (e.g., "Out of adjustment", "Cracked", "Leaking")
            └── Severity  (0 = pass/no defect, 1–10 = defect severity)
```

- **Zones** represent major inspection areas of an asset. Each zone can have an optional reference image (a photo of that area on the vehicle) so drivers know exactly what to inspect.
- **Components** are the specific parts within a zone that get checked.
- **Defects** are the named failure conditions for each component, each with a severity rating.
- A severity of **0** is a pass (recorded for audit trail). Severities **1–10** are actual defects that generate repair work orders.

#### Activation and Sync

Layouts must be explicitly **activated** before they are sent to devices. Activation validates that the layout is complete — every zone has at least one component, every component has at least one defect, and all names are filled in. Only active layouts appear in the device's inspection menu after the next sync.

When a device syncs, it receives the full configuration for all active layouts assigned to its company, along with the roster of assets, users, and inspection types. The device stores this locally so inspections can be conducted offline.

---

## Key Features

**Multi-company support** — Each company's data is fully isolated. A company selector in the nav lets superusers switch between tenants.

**Flexible inspection layouts** — Admins configure inspection forms using a hierarchical Layout Builder: Layout → Zone → Component → Defect. Layouts are activated and pushed to devices on next sync.

**Location-aware filtering** — Users and assets are assigned to locations. Inspections and defects carry location data for site-level reporting and filtering.

**Device token authentication** — Devices authenticate with 10-year JWT tokens issued at provisioning time. Web users authenticate with short-lived httpOnly cookie sessions.

**Photo capture** — Camera-equipped devices can attach JPEG photos to inspections. Photos are stored securely in cloud object storage and accessible through the web UI.

**Native print reports** — Inspection reports and defect lists render as clean, formatted HTML in a new browser tab — optimized for the browser's built-in print dialog.

**Audit trail** — Every inspection check is recorded, including severity-0 (pass) checks, providing a complete audit history for DOT compliance.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) via Drizzle ORM |
| Auth | Pure JWT — RS256, httpOnly cookies (web) / Bearer tokens (devices) |
| State | TanStack Query v5 |
| Storage | Replit App Storage (photos) |
| Routing | Wouter (client), Express (server) |

---

## Getting Started

1. Clone the repo
2. `npm install`
3. Configure environment variables (JWT keys, database URL, object storage)
4. `npm run dev`
5. Provision Brick devices with a device token pointing to the `/api` endpoint

---

## Provenance & License

All code in this repository was written from scratch by Alejandro Vazquez. Commit history provides clear proof of authorship and timeline. No prior employer IP or proprietary code is present.

**License:** Proprietary

---

## Contact

Alejandro Vazquez — alejandrovazquez@yahoo.com
