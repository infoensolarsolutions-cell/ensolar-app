# Spec.md — Ensolar Business Management System (MVP)

> **Instruction to Claude Code:** Build the MVP described in this document. Follow the phase order strictly — Phase 1 must be complete, tested, and usable before starting Phase 2. Ask before making architectural decisions not covered here. Prefer boring, proven technology over novelty. Every feature must work on mobile screens.

---

## 1. Company Context

**Ensolar Solutions Installation Services** — Dumaguete City, Negros Oriental, Philippines.

Services offered:
- Solar panel installation (residential & commercial)
- Electrical installation works (residential & commercial)
- CCTV security systems
- Fire Detection and Alarm Systems (FDAS)
- Solar pump projects
- Retail sale of solar products from store room stock (upsell opportunity)

Team size: 10+ employees (office staff + field technicians).

How customers reach us: walk-in at office, phone call, online (Facebook page, internet search, referrals).

**Current state:** Everything is manual. No CRM, no inventory system, no project tracking, no payroll system, no financial reporting. Inquiries get missed, materials get double-purchased, project profitability is unknown, and after-sales history is not recorded.

## 2. Product Vision

One web-based system (installable as a PWA on phones) that runs the whole business:

1. Capture every inquiry and never lose a lead (CRM)
2. Track every project from quotation → installation → after-sales, including progress payments and per-project profit
3. Know exactly what stock is in the store room (POS + Inventory)
4. Automate attendance and payroll (Phase 2)
5. Give the owner a dashboard: sales pipeline, receivables, stock value, project P&L

## 3. Users & Roles

| Role | Who | Access |
|---|---|---|
| **Owner/Admin** | Business owner | Everything, including financial reports and payroll |
| **Office Staff** | Sales/admin personnel | CRM, quotations, POS, payments, inventory, scheduling |
| **Technician** | Field installers | Assigned projects, attendance check-in, job updates, after-sales tickets, photo uploads |
| **Customer** | Clients | Customer portal: their project status, payment history, pay online, request after-sales service |

Authentication: email/phone + password. Role-based access control enforced on the server, not just the UI. Customers get portal access via an invite link when their first quotation is created.

## 4. Platform & Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS. Built as a **responsive PWA** (installable on Android/iOS home screens) — this covers "mobile app for both staff and customers" without app-store overhead for the MVP.
- **Backend:** Next.js API routes / server actions.
- **Database:** PostgreSQL via Supabase (also provides auth, file storage for site photos, and row-level security).
- **Online payments:** **PayMongo** integration — supports GCash, Maya, and credit/debit cards in the Philippines. Manual payment recording (cash, bank deposit, check) must also be supported with receipt photo upload.
- **Notifications:** Email (Resend or Supabase) + in-app notifications. SMS is out of scope for MVP (note as Phase 3).
- **Currency:** PHP (₱) everywhere. Timezone: Asia/Manila. Date format: DD MMM YYYY.
- **Hosting:** Vercel + Supabase free/pro tiers.

## 5. Phase 1 (MVP Core) — build in this order

### 5.1 Module A: CRM + Sales Inquiries  ← highest priority

**Problem solved:** "Some inquiries cannot be attended to as sales system is not clear."

**Lead capture:**
- Quick-add lead form (usable in under 30 seconds on a phone): name, contact number, email (optional), address/barangay, service interested in (Solar / Electrical / CCTV / FDAS / Solar Pump / Product Purchase), source (Walk-in / Phone / Facebook / Internet Search / Referral — if referral, who referred), notes.
- A public inquiry form (shareable link for the Facebook page) that creates a lead automatically.

**Pipeline (Kanban board):**
`New Inquiry → Contacted → Site Visit Scheduled → Quotation Sent → Negotiation → Won → Lost`
- Every lead must have an assigned staff member and a **next follow-up date**.
- **Overdue follow-ups appear on the dashboard in red.** This is the single most important CRM feature — no inquiry may silently go stale.
- Lost leads require a lost-reason (price, competitor, no budget, no response, other).

**Quotations:**
- Build a quotation from line items (pull products/services from the catalog, or free-text items), with quantity, unit price, subtotal, discount, total.
- Generate a clean PDF with the Ensolar letterhead (logo placeholder), quotation number (`Q-2026-0001`), validity date, and payment terms.
- Status: Draft → Sent → Accepted → Rejected → Expired.
- **Accepting a quotation converts it into a Project (Module B) in one click**, carrying over the customer, line items, and contract amount.

**Reports:** leads per source per month, conversion rate, win/loss reasons, sales per staff member.

### 5.2 Module B: Projects + Progress Payments + After-Sales

**Problem solved:** "Difficult to monitor customer data, progress payments, after-sales services, project history. We will not know if the project is profitable or not."

**Project record:**
- Created from a won quotation (or manually). Fields: project number (`P-2026-0001`), customer, service type, site address, contract amount, start date, target completion, assigned technicians, status: `Pending → Ongoing → Completed → Closed`.
- Timeline/activity log: every status change, payment, note, and photo is logged with timestamp and user.
- Photo uploads (before/during/after installation) from technician phones.

**Progress payments:**
- Define a payment schedule per project (e.g., 50% downpayment, 40% on delivery, 10% on completion) — flexible milestones, not hardcoded.
- Record manual payments (cash/bank/check + receipt photo) or let the customer **pay online through their portal via PayMongo (GCash/Maya/card)**.
- Auto-computed: total paid, balance, overdue milestones. Overdue receivables show on the dashboard.
- Generate an official receipt / acknowledgment PDF per payment.

**Project costing → profitability (the P&L answer at MVP level):**
- Record project costs against each project: materials (pulled from inventory at cost — see Module C), labor, transportation, permits, subcontractor, other.
- Per-project view: **Contract Amount − Total Costs = Gross Profit (₱ and %)**, live as costs are recorded.
- Company-level report: profit per project, per service type, per month. (Full accounting/P&L with expenses outside projects is Phase 2.)

**After-sales service tickets:**
- Any completed project can have service tickets: reported problem, date reported, assigned technician, diagnosis, action taken, parts used (deducted from inventory), status: `Open → In Progress → Resolved`, resolution date, warranty flag (covered / billable — if billable, link a payment).
- Full ticket history visible on the project record — this becomes the permanent service history per customer.
- Automatic reminders: schedule preventive maintenance visits (e.g., 6 or 12 months after completion) — creates a task + notification when due.

**Customer portal (PWA):**
- Customer logs in and sees: their project(s), status, photos, payment schedule, paid/balance, **Pay Now button (PayMongo)**, and a **Request Service** button that creates an after-sales ticket.

### 5.3 Module C: POS + Inventory

**Problem solved:** "Materials purchased even though stock still available. We want to upsell solar products in our store room."

**Product catalog:**
- SKU, name, category (Panels, Inverters, Batteries, Cables, Breakers, CCTV, FDAS, Pumps, Accessories…), unit, cost price, selling price, reorder level, photo (optional).

**Inventory:**
- Stock in: purchases/deliveries (supplier, quantity, unit cost, date, reference no.).
- Stock out: (a) POS sale, (b) issued to a project (records the cost against that project — feeds Module B profitability), (c) used in after-sales ticket, (d) adjustment (damage/loss, requires reason).
- Live stock-on-hand per SKU, stock value at cost, and **low-stock alerts** on the dashboard.
- Before any purchase, staff can search current stock — solving the double-purchasing problem.

**POS (walk-in retail sales):**
- Simple touch-friendly screen: search/scan product → cart → discount → payment (cash / GCash / card via PayMongo, or manual reference) → print/PDF receipt.
- Deducts stock immediately. Daily sales summary (X-report style): total sales, payments by method, items sold.

### 5.4 Dashboard (Owner home screen)

- Today: overdue follow-ups, overdue receivables, low-stock items, open after-sales tickets, upcoming maintenance reminders.
- This month: new leads (by source), quotations sent, projects won, collections, POS sales, gross profit per ongoing project.

### 5.5 Build Sequence for Module A (follow this order)

1. **Project setup** — Next.js + TypeScript + Tailwind, Supabase connection, environment variables, base layout with mobile-first navigation.
2. **Auth and roles** — login, users table with role field, server-side role checks from day one.
3. **Database tables** — customers, leads, quotations, quotation_items, plus a minimal products table (needed for quotation line items before full inventory exists).
4. **Lead capture** — quick-add lead form (usable in under 30 seconds on a phone) and the public inquiry form (shareable link) that auto-creates leads.
5. **Pipeline Kanban board** — seven stages, drag to move, lost-reason required, overdue follow-ups highlighted in red.
6. **Quotations** — line-item builder, sequential numbering, PDF with letterhead placeholder, status flow, and one-click "Accepted → create Project" (creates a placeholder project row until Module B is built).
7. **Mini-dashboard** — overdue follow-ups + this month's leads by source (full dashboard comes after Modules B and C).
8. **Seed data + end-to-end test** — public form → lead → assigned → quotation PDF → accepted.

After each numbered step, stop and show the owner what was built before continuing.

## 6. Phase 2 (build only after Phase 1 is live)

### 6.1 Module D: HR — Attendance + Payroll
- Employee records: name, position, daily/monthly rate, SSS/PhilHealth/Pag-IBIG numbers, date hired.
- Attendance: staff/technician clock-in/out on their phone (PWA), with timestamp; GPS capture optional. Admin can correct entries with an audit trail.
- Leave/absence recording.
- Payroll runs (semi-monthly, standard PH practice): compute gross from attendance × rate, less deductions — SSS, PhilHealth, Pag-IBIG contributions (use configurable contribution tables, admin-editable — do NOT hardcode rates), withholding tax (configurable table), cash advances/loans.
- Output: payslip PDF per employee, payroll register per cutoff.

### 6.2 Module E: Accounting & Financial Reports
- Record non-project expenses (rent, utilities, salaries link from payroll, marketing, fuel…), by category and month.
- **P&L report:** Revenue (project collections + POS sales) − COGS (materials at cost) − Operating expenses = Net profit. Monthly and yearly, with month-over-month comparison.
- Receivables aging report.
- Cash-basis accounting is acceptable for MVP-level reporting; note this in the UI.

### 6.3 Module F: Marketing & Engagement
- Simple campaign tracker: campaign name, channel (Facebook, flyers, referral promo), cost, start/end date — and automatic lead attribution (leads tagged with campaign) → cost per lead, cost per won project.
- Broadcast announcements to customer portal (promos on store-room solar products = upsell channel).
- Recurring reminder: if no campaign has been active for 30 days, alert the owner ("marketing left open" problem).

## 7. Data Model (core tables — Claude Code: refine as needed)

```
users (id, name, email, phone, role, password_hash, active)
customers (id, name, phone, email, address, source, referred_by, created_at)
leads (id, customer_id, service_type, status, assigned_to, next_followup_at, lost_reason, campaign_id, notes)
quotations (id, quote_no, lead_id, customer_id, status, valid_until, total, terms)
quotation_items (id, quotation_id, product_id?, description, qty, unit_price, line_total)
projects (id, project_no, customer_id, quotation_id?, service_type, site_address, contract_amount, status, start_date, target_date, completed_date)
project_assignments (project_id, user_id)
payment_milestones (id, project_id, label, percent_or_amount, due_date, status)
payments (id, project_id?, pos_sale_id?, milestone_id?, amount, method, provider_ref?, receipt_photo?, received_by, received_at)
project_costs (id, project_id, type, description, amount, inventory_txn_id?, date)
service_tickets (id, project_id, reported_at, problem, diagnosis, action_taken, status, assigned_to, warranty, resolved_at)
maintenance_reminders (id, project_id, due_date, status)
products (id, sku, name, category, unit, cost_price, selling_price, reorder_level, photo)
inventory_txns (id, product_id, type[in|sale|project_issue|ticket_issue|adjustment], qty, unit_cost, ref_table, ref_id, date, user_id)
pos_sales (id, sale_no, items_json/lines, total, discount, payment_method, sold_by, sold_at)
-- Phase 2:
employees (id, user_id?, position, rate_type, rate, sss_no, philhealth_no, pagibig_no, hired_at)
attendance (id, employee_id, clock_in, clock_out, source, edited_by?)
payroll_runs / payslips / deduction_tables
expenses (id, category, description, amount, date)
campaigns (id, name, channel, cost, start_date, end_date)
```

## 8. Non-Functional Requirements

- **Mobile-first.** Technicians and customers will use phones. Every Phase 1 screen must be tested at 380px width.
- **Simple UI, minimal training.** Office staff are not tech experts. Big buttons, clear labels, Filipino-friendly plain English.
- **Fast on slow connections.** Optimize images; the PWA should cache the shell for spotty mobile data in Negros Oriental.
- **Audit trail** on payments, inventory adjustments, and attendance edits (who/when/what changed).
- **Backups:** rely on Supabase automated backups; add a "Export to Excel/CSV" button on customers, projects, payments, inventory, and sales lists.
- **Security:** server-side role checks, RLS on Supabase, customers can only see their own data. Never store card details (PayMongo handles that).
- **Numbering:** all documents get sequential, year-prefixed numbers (Q-2026-0001, P-2026-0001, OR-2026-0001, S-2026-0001).

## 9. Out of Scope (MVP)

- Native iOS/Android app-store apps (PWA only)
- BIR-accredited official receipts / CAS accreditation (issue "Acknowledgment Receipt" PDFs; consult accountant separately)
- SMS notifications
- Multi-branch support
- Double-entry accounting / full general ledger
- Facebook Messenger auto-integration (public inquiry form link is the MVP substitute)

## 10. Definition of Done (Phase 1)

Walk through this end-to-end scenario successfully:

1. A Facebook inquiry submits the public form → appears as a New Inquiry, assigned to staff, with a follow-up date.
2. Staff creates a quotation for a 3kW solar installation, sends the PDF, marks it Accepted → project auto-created.
3. A 50/40/10 payment schedule is set. Customer logs into the portal and pays the downpayment via GCash (PayMongo test mode). Balance updates; receipt PDF generated.
4. Panels and inverters are issued from inventory to the project → stock decreases, cost recorded, project gross profit updates live.
5. Technician uploads installation photos and marks the project Completed → a 6-month maintenance reminder is scheduled.
6. Walk-in customer buys a battery at the POS with cash → stock decreases, daily sales report shows it.
7. Two months later the customer submits a service request from the portal → ticket created, technician records diagnosis and fix, ticket resolved → visible in project history.
8. Owner dashboard correctly shows: overdue follow-ups, receivables, low stock, open tickets, and monthly gross profit.

Seed the database with realistic demo data (10 products, 5 leads, 2 projects, 1 ticket) so the owner can explore immediately.

---

*Prepared for Ensolar Solutions Installation Services — Dumaguete City. Phase 1 priority order confirmed by the owner: (1) CRM + Sales, (2) Projects + Payments + After-Sales, (3) POS + Inventory, (4) HR + Payroll in Phase 2.*
