# Business Assessment Platform - User Guide

## Purpose

The Business Assessment Platform helps consultants and business analysts conduct comprehensive business assessments for their clients. You can create assessments, track answers across multiple criteria, generate AI-powered insights, and produce professional reports.

## Access

**Login required** - Use your Manus account to access the platform.

---

## Powered by Manus

This application is built with cutting-edge web technologies for maximum performance and reliability:

**Frontend**: React 19 with TypeScript, Tailwind CSS 4, shadcn/ui component library, Recharts for data visualization

**Backend**: Express 4 with tRPC 11 for type-safe API communication, Drizzle ORM for database operations

**Database**: MySQL/TiDB with 2,343 pre-loaded assessment questions across 3 comprehensive frameworks (Business Control, IT Management Services, Workplace Strategy)

**AI Integration**: OpenAI GPT-4 for intelligent analysis and actionable insights generation

**Authentication**: Manus OAuth for secure user management with role-based access control

**Deployment**: Auto-scaling infrastructure with global CDN for fast worldwide access

---

## Using Your Website

### Managing Clients

Click "Manage Clients" from the dashboard or navigate to "Clients" in the sidebar. Click "Add Client" to create a new client record. Fill in company name, industry, contact details, and notes. Click "Edit" on any client card to update information or "Delete" to remove.

### Creating Assessments

Navigate to "Assessments" in the sidebar and click "New Assessment". Enter an assessment title, select a client from the dropdown, and choose an assessment type (Business Control, IT Management Services, or Workplace Strategy). Click "Create Assessment" to begin.

### Completing Assessments

Click "Continue" on an in-progress assessment. Questions are organized by criterion tabs at the top. Rate each question from 1 (Strongly Disagree) to 5 (Strongly Agree). Add optional notes for context. Answers save automatically. Track progress at the top of the page. Click "Complete Assessment" when at least 50% of questions are answered.

### Viewing Results

Completed assessments show "View Results" button. The results page displays overall score, radar chart visualization, and criterion breakdown. Click "Generate AI Insights" to receive executive summary, key strengths, critical gaps, prioritized action items, and implementation timeline.

---

## Managing Your Website

### Dashboard Panel

Access the Dashboard panel from the Management UI to view site analytics, visitor statistics, and assessment completion rates.

### Database Panel

Use the Database panel to view all stored data including clients, assessments, answers, and scores. Full connection details are available in the bottom-left settings for external database tools.

### Settings Panel

**General**: Customize website name and logo via VITE_APP_TITLE and VITE_APP_LOGO variables

**Domains**: Modify the auto-generated domain prefix or bind custom domains for professional branding

**Notifications**: Configure notification settings for assessment completion alerts

---

## Next Steps

Talk to Manus AI anytime to request changes or add features. You can ask to add PDF report generation, email notifications for completed assessments, or custom assessment templates. The platform is ready to help you deliver professional business assessments to your clients.
