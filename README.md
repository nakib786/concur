# SAP Concur Clone - ExpenseTracker

A modern, responsive web application for expense management with OCR receipt processing, built with Next.js, Supabase, and Google Cloud Vision API.

## ✨ Features

- **Authentication**: Secure login/signup with Supabase Auth
- **OCR Processing**: Automatic receipt data extraction using Google Cloud Vision API
- **Receipt Management**: Upload, view, and edit receipt information
- **Expense Reports**: Create and manage expense reports with approval workflow
- **Role-Based Access**: Employee, Manager, and Admin roles with appropriate permissions
- **Responsive Design**: Modern UI built with Tailwind CSS and ShadCN UI
- **Real-time Updates**: Live data synchronization with Supabase

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript
- **Styling**: Tailwind CSS, ShadCN UI
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **OCR**: Google Cloud Vision API
- **Hosting**: Vercel (recommended)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Cloud Platform account (for Vision API)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd concur
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key
```

### 3. Database Setup

1. Create a new Supabase project
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `database_schema.sql`
4. Run the SQL to create all tables, policies, and functions

### 4. Google Cloud Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Vision API
4. Create credentials (API Key)
5. Add the API key to your `.env.local` file

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── ocr/           # OCR processing endpoint
│   ├── auth/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/         # Main dashboard
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable components
│   └── ui/               # ShadCN UI components
├── lib/                  # Utility libraries
│   └── supabase.ts       # Supabase client
├── types/                # TypeScript type definitions
│   └── database.types.ts # Database schema types
└── utils/                # Helper functions
```

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level security policies
- **Server-side OCR**: API keys and processing happen server-side
- **Role-based Access Control**: Different permissions for employees, managers, and admins
- **Secure Authentication**: Handled by Supabase Auth

## 🎯 Usage

### For Employees:
1. Sign up with your email and create a profile
2. Upload receipt images or PDFs
3. Review and edit OCR-extracted data
4. Create expense reports by adding receipts
5. Submit reports for manager approval

### For Managers:
1. View all employee submissions
2. Approve or reject expense reports
3. Add comments and feedback
4. Access analytics and reporting

### For Admins:
1. Full access to all features
2. User management capabilities
3. System-wide analytics and reporting

## 🔧 Configuration

### Supabase Configuration

The application uses Supabase for:
- User authentication and management
- PostgreSQL database with Row Level Security
- Real-time subscriptions (future feature)
- File storage for receipt images

### Google Vision API Configuration

The OCR functionality uses Google Cloud Vision API's `DOCUMENT_TEXT_DETECTION` feature to:
- Extract text from receipt images
- Parse vendor names, amounts, and dates
- Return structured data for manual review

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Environment Variables for Production

Make sure to set these in your deployment platform:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_VISION_API_KEY=
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-username/concur/issues) page
2. Create a new issue with detailed information
3. Include error messages, browser console logs, and steps to reproduce

## 🎉 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for backend-as-a-service
- [ShadCN UI](https://ui.shadcn.com/) for beautiful components
- [Google Cloud Vision](https://cloud.google.com/vision) for OCR capabilities
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling 