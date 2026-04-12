# Chickenplus Inventory Management

Internal inventory and supplier-order management platform built for restaurant operations.

This application replaces manual weekly stock-control workflows with a structured digital process: staff complete inventory checklists, flag missing items, generate supplier-based order suggestions, track order delivery, export operational data, and review historical records.

## Why this project matters

Restaurant inventory work is often handled through paper checklists, ad-hoc supplier communication, and fragmented order tracking. This project turns that workflow into a single internal system with role-based access, operational reporting, and exportable records.

## Key Features

- Weekly inventory checklists with free-text stock entries and missing-item flags
- Background generation of supplier-based draft orders
- Admin-managed supplier and product-supplier mapping
- Order lifecycle tracking from draft to delivered
- Reports for checklist activity, stock trends, and supplier performance
- Excel export for completed checklists
- Archive view for historical checklist review
- Admin/Staff access model enforced with Supabase RLS

## Technical Highlights

- Built with **Next.js 16**, **TypeScript**, **Supabase**, and **PostgreSQL**
- Uses **Server Actions** and **SQL RPC functions** for core workflows
- Transactional order finalization to prevent half-written order states
- Batched optimistic autosave for faster checklist editing
- Reporting tied to **operational checklist dates** instead of raw record timestamps
- Export flow hardened against Excel formula injection
- Unit and integration test coverage with **Vitest**

## Architecture

The application follows a server-first architecture built around Next.js App Router and Supabase.

```text
Client UI
   ↓
Next.js App Router / Server Components
   ↓
Server Actions / SQL RPC Functions
   ↓
Supabase PostgreSQL Database
   ↓
Auth / Row Level Security / Storage
```

### Architectural Principles

- **Server-first rendering** for secure data loading and predictable auth boundaries
- **Transactional SQL RPC functions** for critical multi-step workflows
- **Optimistic UI with batched autosave** for responsive checklist editing
- **Role-based access control** enforced at both UI and database level
- **Operational correctness prioritized over over-engineering**

## My Role / Engineering Ownership

This project was designed and implemented end-to-end by me, including:

- Product and workflow design based on real restaurant operational needs
- Database schema and relational modeling
- Backend business logic and transactional SQL/RPC workflows
- Frontend UI/UX implementation with responsive design
- Auth and role/permission model design
- Reporting and export architecture
- Test strategy and smoke-test planning
- Documentation and deployment preparation

## Engineering Decisions & Challenges

Some important architectural decisions made during development:

### Transactional Order Finalization
Supplier-order creation and checklist "ordered" capture are executed in one transactional database boundary to prevent half-written states.

### Operational Reporting Model
Reports are based on `checklist_date` rather than raw database timestamps to reflect real operational dates.

### Autosave Performance
Checklist editing uses debounced batched autosave instead of row-by-row updates to improve UX and reduce network overhead.

### Suggestion Safety
Order suggestions exclude products already present in open orders to prevent accidental duplicate ordering.

## Project Status

Current Status: **Operational Release Candidate**

The application is currently stable for internal small-team operational use.

### Planned Improvements

- End-to-end browser smoke automation
- Admin-facing audit log viewer
- Product/master-data management UI
- Expanded analytics/reporting filters
- Improved multi-user conflict handling

## Documentation

Detailed project documentation is available in `/docs`.

- **Business Rules:** Functional workflow and product logic
- **API Specification:** Internal actions and SQL/RPC contracts
- **Smoke Tests:** Manual verification scenarios
- **Deployment Guide:** Environment and release preparation
