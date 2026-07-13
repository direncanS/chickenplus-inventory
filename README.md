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
