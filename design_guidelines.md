# Design Guidelines: Inspection Brick

## Design Approach
**System-Based Approach** - Drawing from Material Design and modern SaaS applications (Linear, Notion, Asana) for data-heavy enterprise tools. This application prioritizes clarity, efficiency, and data accessibility over visual flair.

**Key Design Principles:**
- Information clarity and scanbility for inspection data
- Efficient workflows with minimal friction
- Professional, trustworthy aesthetic for enterprise use
- Consistent patterns across all CRUD operations

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 220 70% 50% (Professional blue for actions, links)
- Background: 0 0% 100% (Pure white)
- Surface: 220 14% 96% (Light gray for cards, table headers)
- Border: 220 13% 91% (Subtle borders)
- Text Primary: 220 9% 15% (Near-black for readability)
- Text Secondary: 220 9% 46% (Gray for secondary information)
- Success: 142 71% 45% (Status indicators - repaired)
- Warning: 38 92% 50% (Medium severity defects)
- Error: 0 84% 60% (High severity defects, open status)

**Dark Mode:**
- Primary: 220 70% 60% (Slightly lighter blue)
- Background: 220 13% 10% (Dark charcoal)
- Surface: 220 13% 14% (Elevated dark gray)
- Border: 220 13% 20% (Subtle dark borders)
- Text Primary: 220 9% 95% (Off-white)
- Text Secondary: 220 9% 65% (Light gray)

### B. Typography
- **Primary Font:** Inter (via Google Fonts CDN)
- **Headings:** 
  - H1: text-2xl font-semibold (Top bar title)
  - H2: text-xl font-semibold (Modal titles)
  - H3: text-lg font-medium (Section headers)
- **Body:** text-sm font-normal (Table content, forms)
- **Labels:** text-xs font-medium uppercase tracking-wide (Column headers, field labels)
- **Monospace:** font-mono text-xs (IDs, timestamps)

### C. Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16
- Consistent padding: p-4 for cards, p-6 for modals
- Margins: mb-6 between sections, gap-4 for grids
- Container: max-w-7xl mx-auto px-6

### D. Component Library

**Top Navigation Bar:**
- Fixed height: h-16
- Background: bg-surface with border-b
- Logo area: w-10 h-10 rounded-lg with brand color
- Project name: text-lg font-semibold ml-3
- Menu items: Horizontal list with hover:bg-surface-hover, active state with border-b-2 border-primary
- Responsive: Hamburger menu on mobile (< md)

**Data Table (Inspections List):**
- Container: bg-white dark:bg-surface rounded-lg border
- Header row: bg-surface sticky top-0 with sortable column indicators
- Row height: h-14 with hover:bg-surface
- Cell padding: px-4 py-3
- Actions column: Fixed right with edit icon button
- Alternating row backgrounds for improved scannability
- Loading state: Skeleton rows with pulse animation

**Search & Filters Bar:**
- Positioned above table with mb-4
- Search input: w-full md:w-96 with search icon prefix
- Layout: Flexbox with gap-4, search left, filters right

**Pagination Controls:**
- Positioned below table with mt-4
- Display: "Showing 1-20 of 157 inspections"
- Buttons: Previous/Next with page numbers
- Style: Outlined buttons with current page in primary color

**Modal (Inspection Details):**
- Overlay: backdrop-blur-sm bg-black/50
- Container: max-w-4xl bg-white dark:bg-surface rounded-xl shadow-2xl
- Header: Sticky with close button, inspection ID, and timestamp
- Body: Two-column layout - Inspection data (left) + Defects table (right)
- Defects table includes severity badges (0-33: success, 34-66: warning, 67-100: error)
- Status badges: Pill-shaped with appropriate colors (open: error, pending: warning, repaired: success)
- Footer: Action buttons (Close, Export) aligned right

**Severity Indicator:**
- Visual bar: w-full h-2 rounded-full with gradient based on severity value
- Number display: text-sm font-medium with color coding
- Tooltip on hover showing exact severity score

**Status Badge:**
- Pill shape: px-3 py-1 rounded-full text-xs font-medium
- Open: bg-error/10 text-error
- Pending: bg-warning/10 text-warning
- Repaired: bg-success/10 text-success

**Empty States:**
- Icon: Heroicons outline style, size-16, text-secondary
- Message: text-lg font-medium text-secondary
- Action button: Primary colored CTA when applicable

### E. Animations
**Minimal Motion:**
- Modal entrance: fade-in with slight scale (0.95 to 1) over 200ms
- Table row hover: background color transition 150ms
- Button interactions: Standard browser defaults
- No scroll-triggered or autoplay animations

---

## Images
This is a data-focused enterprise application - **no hero images needed**. The application opens directly to the inspections table for immediate productivity. 

**Icon Usage:**
- Heroicons (outline style via CDN) for all UI icons
- Navigation icons: document-text, wrench-screwdriver, cube, users, clipboard-document-list
- Action icons: pencil-square, magnifying-glass, chevron-left/right, x-mark
- Status icons: check-circle, clock, exclamation-triangle

---

## Screen-Specific Guidelines

**Home Page (Inspections List):**
- Top bar with full navigation
- Page title "Inspections" (text-2xl font-semibold mb-6)
- Search bar spans full width on mobile, partial on desktop
- Table fills remaining viewport height with internal scrolling
- Responsive: Stack to card layout on mobile (< md)

**Inspection Modal:**
- Full-screen on mobile, centered overlay on desktop
- Inspection metadata grid: 2 columns showing all inspection fields
- Defects section: Dedicated table below metadata with all defect fields visible
- Scrollable body if content exceeds viewport
- Clear visual separation between inspection data and defects list

This design creates a professional, efficient tool optimized for frequent daily use by inspection teams, prioritizing data clarity and workflow speed over decorative elements.