export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'employee' | 'manager' | 'admin'
          department: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'employee' | 'manager' | 'admin'
          department?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'employee' | 'manager' | 'admin'
          department?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          file_url: string
          file_name: string
          vendor_name: string | null
          amount: number | null
          date: string | null
          category: string | null
          description: string | null
          ocr_data: any | null
          status: 'pending' | 'approved' | 'rejected' | 'error'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_url: string
          file_name: string
          vendor_name?: string | null
          amount?: number | null
          date?: string | null
          category?: string | null
          description?: string | null
          ocr_data?: any | null
          status?: 'pending' | 'approved' | 'rejected' | 'error'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_url?: string
          file_name?: string
          vendor_name?: string | null
          amount?: number | null
          date?: string | null
          category?: string | null
          description?: string | null
          ocr_data?: any | null
          status?: 'pending' | 'approved' | 'rejected' | 'error'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expense_reports: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          total_amount: number
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
          submitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          total_amount: number
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          total_amount?: number
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expense_report_items: {
        Row: {
          id: string
          expense_report_id: string
          receipt_id: string
          created_at: string
        }
        Insert: {
          id?: string
          expense_report_id: string
          receipt_id: string
          created_at?: string
        }
        Update: {
          id?: string
          expense_report_id?: string
          receipt_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 