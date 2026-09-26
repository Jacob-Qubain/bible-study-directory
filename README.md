# Find A Bible Study

A responsive, friction-free discovery and member-onboarding platform built for university campuses to streamline how students connect with small groups and how group leaders manage outreach.

**Live Application:** [findabiblestudy.org](https://findabiblestudy.org)

---

## Overview

Joining campus small groups often involves scattered Google Forms, outdated group chats, or chaotic club fairs. **Find A Bible Study** solves this drop-off by removing onboarding barriers for students while giving group leaders a structured pipeline to track interest and coordinate immediate outreach.

Designed and deployed for real-world user workflows, the platform prioritizes accessible UI/UX, responsive mobile layouts, and fast lead delivery to leaders.

---

## Key Features

### For Students (Frictionless Joining)
- **Zero-Friction Search & Filter:** Rapid group discovery by meeting day, campus location, demographic, and time without mandatory account creation.
- **Low-Barrier Signups:** Minimal data intake (Name, Preferred Contact Method, Year) designed to maximize conversion and prevent sign-up fatigue.
- **Mobile-First Experience:** Tailored for college students scanning physical QR codes on campus fliers or opening links via social bio pages.

### For Small Group Leaders (Outreach Workflow)
- **Centralized Roster View:** Clean dashboard to monitor incoming sign-ups and manage group capacity in real time.
- **Direct Outreach Triggers:** One-click links for SMS, WhatsApp, or email directly from the leader interface to eliminate contact delay.
- **Status Tracking:** Visual markers for leaders to track who has been contacted, confirmed, or added to group threads.

---

## Tech Stack & Architecture

- **Frontend:** React / TypeScript / Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Row-Level Security, Realtime subscriptions)
- **Deployment & Hosting:** Vercel (Production CI/CD pipeline synced to `main`)
- **Authentication:** Role-based access control for administrative leader management

---

## Engineering Highlights & Design Decisions

- **Conversion-Optimized UX:** Architected the student discovery flow with optimistic UI updates and minimal form validation steps, drastically lowering friction compared to traditional multi-step university club portals.
- **Secure Data Access with RLS:** Configured PostgreSQL Row-Level Security (RLS) policies to ensure leaders can only view and manage leads specifically assigned to their group roster.
- **Decoupled Architecture:** Built with modular UI components and reusable data hooks, allowing rapid campus-specific re-theming or database schema migrations.

---

## Local Development Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/find-a-bible-study.git](https://github.com/your-username/find-a-bible-study.git)
   cd find-a-bible-study
