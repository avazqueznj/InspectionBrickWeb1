# Design Guidelines: Inspection Brick

## Design Approach
**System-Based Approach** with **Industrial-Retro Aesthetic** - Drawing from dark-mode SaaS applications (Linear, Notion, Asana) enhanced with industrial design elements inspired by the retro orange brick branding. This creates a professional enterprise tool with distinctive character while maintaining data clarity and workflow efficiency.

**Key Design Principles:**
- Dark industrial aesthetic with vibrant orange accents
- Information clarity optimized for dark backgrounds
- Professional yet distinctive visual identity
- Efficient data-heavy workflows with minimal friction
- Subtle retro touches honoring the 8-bit brick logo

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary Theme):**
- **Primary Orange:** 14 100% 56% (Vibrant #FF5722 - brick accent)
- **Background:** 220 13% 8% (Deep charcoal black)
- **Surface:** 220 13% 12% (Elevated dark gray for cards, tables)
- **Surface Hover:** 220 13% 16% (Subtle hover states)
- **Border:** 220 10% 20% (Industrial metal-like borders)
- **Text Primary:** 0 0% 98% (Crisp white)
- **Text Secondary:** 220 5% 65% (Light gray for metadata)
- **Text Muted:** 220 5% 45% (Dimmed text)

**Status Colors (Dark-Optimized):**
- **Success:** 142 71% 50% (Repaired/complete status)
- **Warning:** 38 92% 58% (Pending/medium severity)
- **Error:** 14 100% 60% (Open defects - matching orange theme)
- **Info:** 220 70% 65% (Informational states)

**Light Mode (Optional Alternative):**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Primary remains orange, text inverted

### B. Typography

**Font Stack:**
- **Primary:** Inter (Google Fonts CDN) - clean, professional readability
- **Monospace:** JetBrains Mono (Google Fonts CDN) - for IDs, timestamps, technical data
- **Logo:** Press Start 2P or similar pixel font for retro 8-bit aesthetic in header

**Hierarchy:**
- **H1:** text-2xl font-bold tracking-tight (Page titles)
- **H2:** text-xl font-semibold (Section headers, modal titles)
- **H3:** text-lg font-medium (Card headers, subsections)
- **Body:** text-sm font-normal (Table content, descriptions)
- **Labels:** text-xs font-semibold uppercase tracking-wider text-secondary (Field labels)
- **Monospace Data:** font-mono text-xs (Inspection IDs, equipment codes)
- **Micro:** text-xs (Timestamps, helper text)

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-6 for cards, p-8 for modals
- Section spacing: space-y-6 between major sections
- Grid gaps: gap-4 for compact layouts, gap-6 for breathable layouts
- Container: max-w-7xl mx-auto px-6
- Table cell padding: px-4 py-3

### D. Component Library

**Top Navigation Bar:**
- Height: h-16, bg-surface with border-b-2 border-border
- Logo: 8-bit brick graphic (48x48px) with "INSPECTION BRICK" in Press Start 2P font
- Navigation items: Horizontal list, text-sm font-medium, hover:text-primary transition
- Active state: border-b-2 border-primary
- User menu: Right-aligned with avatar and dropdown
- Responsive: Slide-out drawer on mobile with bg-background/95 backdrop-blur

**Data Table (Inspections List):**
- Container: bg-surface rounded-lg border border-border overflow-hidden
- Header: bg-surface sticky top-0 z-10, text-xs uppercase tracking-wider text-secondary
- Row: h-14 border-b border-border/50 hover:bg-surface-hover transition-colors
- Zebra striping: even:bg-background/30 for enhanced scannability
- Cell alignment: Left for text, center for badges, right for actions
- Actions column: w-20 with icon buttons (text-secondary hover:text-primary)
- Loading state: Skeleton rows with shimmer animation
- Empty state: Centered icon (Heroicons wrench-screwdriver) with "No inspections found" message

**Search & Filter Controls:**
- Search input: h-10 bg-background border border-border rounded-lg pl-10 (search icon), focus:border-primary focus:ring-2 focus:ring-primary/20
- Filter buttons: Chip-style with bg-surface hover:bg-surface-hover, active:bg-primary/10 active:border-primary
- Layout: Sticky top-16 bg-background/95 backdrop-blur p-4 border-b border-border

**Pagination:**
- Container: mt-4 flex justify-between items-center
- Info text: "Showing 1-20 of 157" in text-sm text-secondary
- Buttons: h-9 px-4 bg-surface hover:bg-surface-hover border border-border rounded-md
- Current page: bg-primary text-white

**Modal (Inspection Details):**
- Overlay: bg-black/80 backdrop-blur-sm
- Container: max-w-5xl bg-surface rounded-2xl border-2 border-border shadow-2xl
- Header: h-16 px-8 flex items-center justify-between border-b-2 border-border/50, sticky top-0 bg-surface/95 backdrop-blur
- Title: Inspection ID in font-mono text-xl with timestamp in text-xs text-secondary
- Body: p-8 space-y-8, two-column grid (lg:grid-cols-2) for metadata
- Defects section: Full-width table below metadata with bg-background rounded-lg
- Footer: px-8 py-4 border-t border-border/50 flex justify-end gap-3
- Close button: Absolute top-4 right-4, hover:rotate-90 transition-transform

**Severity Indicator:**
- Bar: h-3 w-24 bg-background rounded-full overflow-hidden
- Fill: Gradient based on severity (0-33: success, 34-66: warning, 67-100: error), rounded-full
- Label: font-mono text-sm font-bold with matching color
- Container: flex items-center gap-3

**Status Badges:**
- Shape: px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
- Open: bg-error/20 text-error ring-1 ring-error/30
- Pending: bg-warning/20 text-warning ring-1 ring-warning/30
- Repaired: bg-success/20 text-success ring-1 ring-success/30
- Dot indicator: w-2 h-2 rounded-full with pulsing animation for "Open" status

**Buttons:**
- Primary: bg-primary hover:bg-primary/90 text-white h-10 px-6 rounded-lg font-medium shadow-lg shadow-primary/20
- Secondary: bg-surface hover:bg-surface-hover border border-border h-10 px-6 rounded-lg
- Ghost: hover:bg-surface-hover h-10 px-4 rounded-lg text-secondary hover:text-primary
- Icon-only: w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-hover

**Form Inputs:**
- Height: h-10
- Background: bg-background border border-border rounded-lg px-4
- Focus: border-primary ring-2 ring-primary/20 outline-none
- Disabled: opacity-50 cursor-not-allowed
- Labels: text-sm font-semibold text-secondary mb-2

**Cards (Dashboard Widgets):**
- Container: bg-surface rounded-xl border border-border p-6
- Header: flex justify-between items-center mb-4
- Icon: w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center
- Stat number: text-3xl font-bold
- Stat label: text-sm text-secondary uppercase tracking-wide

### E. Animations

**Minimal, Purpose-Driven Motion:**
- Modal entrance: Fade in with scale(0.95→1) over 200ms ease-out
- Table row hover: Background color transition 150ms
- Button interactions: Transform scale(0.98) on active state, 100ms
- Status badge pulse: Subtle 2s infinite pulse for "Open" status
- Loading skeleton: Shimmer gradient animation 1.5s linear infinite
- Dropdown menus: Slide down with fade, 200ms ease-out

---

## Icons

**Heroicons (Outline Style via CDN):**
- Navigation: wrench-screwdriver, clipboard-document-list, truck, building-office, chart-bar
- Actions: pencil-square, magnifying-glass, funnel, arrow-down-tray, x-mark
- Status: check-circle, clock, exclamation-circle, shield-check
- UI: chevron-down, chevron-left, chevron-right, bars-3, user-circle

---

## Images

**No Hero Images** - This is a productivity-first application that opens directly to the inspections data table. The visual identity is established through:
- Retro 8-bit brick logo in header (48x48px pixel art graphic)
- Industrial aesthetic via color palette and component styling
- Data visualization takes precedence over decorative imagery

**Placeholder Graphics:**
- Empty states: Heroicons in size-20 text-secondary/50
- Loading states: Skeleton shapes with shimmer effect
- Error states: Illustrated icon with industrial theme

---

## Screen-Specific Guidelines

**Inspections List (Home):**
- Opens directly to full data table for immediate productivity
- Fixed top nav (h-16) with search bar integrated or below
- Filter chips below nav for quick status/severity filtering
- Table fills viewport with internal scrolling
- Sticky table headers during scroll
- Responsive: Card layout on mobile with key info visible, tap to expand

**Inspection Detail Modal:**
- Full-screen on mobile (< lg), centered overlay on desktop
- Two-section layout: Inspection metadata grid + Defects table
- Metadata: 2-column grid (lg:grid-cols-2) showing vehicle info, inspector, timestamp
- Defects: Full-width table with severity bars, status badges, and corrective actions
- Export button generates PDF with orange branding
- Scrollable content area with sticky header

**Dashboard (Optional):**
- 4-card stat grid: Total inspections, Open defects, Pending repairs, Compliance rate
- Charts with orange accents: Bar chart for defects by severity, line chart for trends
- Recent activity feed with timestamps in monospace font

This design creates a distinctive, professional inspection tool that balances enterprise functionality with memorable retro-industrial branding, optimized for dark-mode workflows and data-intensive daily use.