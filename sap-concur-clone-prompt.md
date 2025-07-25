# SAP Concur Clone - Web App Specification Prompt for Cursor AI

## 🧩 Objective

Create a modern, responsive web application similar to **SAP Concur** that enables users to upload receipts, automatically parse receipt data using **Google Cloud Vision OCR API**, and manage expense reports with an approval workflow. All requests should be processed **server-side** to ensure security of sensitive information.

---

## 🛠️ Tech Stack

- **Frontend Framework**: Next.js (latest version with App Router)
- **Styling/UI**: Tailwind CSS with **ShadCN UI** or **Chakra UI**
- **Backend**: Next.js API Routes (or Server Actions)
- **Authentication & Database**: Supabase (Auth + PostgreSQL)
- **OCR Integration**: Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`)
- **Hosting**: Vercel

---

## 📦 Features

### User-Facing:
- [ ] Secure login/signup via Supabase Auth
- [ ] Upload receipts (images or PDFs)
- [ ] OCR-based auto-extraction of:
  - Vendor name
  - Date
  - Total amount
  - Line items (if possible)
- [ ] Manual edit of parsed data before submission
- [ ] Expense report creation and submission
- [ ] View past receipts and reports
- [ ] Responsive dashboard with filters (by date, category, status)

### Admin/Manager Panel:
- [ ] View all employee submissions
- [ ] Approve or reject expense reports
- [ ] Add comments or send back for revision
- [ ] View analytics (total expenses, pending reports, etc.)

---

## 🔐 Security

- All API calls and OCR logic handled server-side (`app/api/*` or server actions)
- Secrets and keys stored in Vercel environment variables
- Strict RBAC using Supabase (Admin, Manager, Employee)

---

## 🌐 API Integration

### Google Cloud Vision OCR
- Use `DOCUMENT_TEXT_DETECTION` feature
- Base64 encode image and POST to:
  `https://vision.googleapis.com/v1/images:annotate?key=$GOOGLE_VISION_API_KEY`
- Parse and extract relevant fields with custom logic
- Show editable parsed results in UI

---

## 🖼️ UI/UX Guidelines

- Responsive design using **ShadCN UI** or **Chakra UI**
- Use modern component library for input fields, tables, buttons, modals
- Clean, minimal dashboard with analytics cards and data tables
- Use toast notifications for success/error messages

---

## 📁 Folder Structure (Next.js App Router)

```plaintext
/app
  /dashboard
  /upload
  /reports
  /admin
  /api
    /ocr
    /expenses
    /auth
/components
/lib
/utils
/styles
```

---

## 🔧 Environment Variables

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_VISION_API_KEY=
```

---

## 🚀 Deployment

- Host on **Vercel**
- Set environment variables securely via Vercel dashboard
- Use `.env.local` locally for development

---

## 📌 Notes

- Ensure all logic is server-side to prevent client-side data leaks
- Use Supabase Row Level Security (RLS) to protect user data
- Build using latest Next.js features (App Router, Server Components, Server Actions)

---

## 📅 Date Generated

July 25, 2025
