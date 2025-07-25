-- Setup Database with Proper RLS Policies for Signup
-- Run this in Supabase SQL Editor

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Create RLS policies for profiles table
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to create their own profile during signup
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage all profiles (for server-side operations)
CREATE POLICY "Service role can manage all profiles" ON profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on receipts table
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can create own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON receipts;
DROP POLICY IF EXISTS "Admins can view all receipts" ON receipts;
DROP POLICY IF EXISTS "Admins can update all receipts" ON receipts;

-- Create RLS policies for receipts table
-- Allow users to view their own receipts
CREATE POLICY "Users can view own receipts" ON receipts
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create their own receipts
CREATE POLICY "Users can create own receipts" ON receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own receipts
CREATE POLICY "Users can update own receipts" ON receipts
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts" ON receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update all receipts (for approval)
CREATE POLICY "Admins can update all receipts" ON receipts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Enable RLS on expense_reports table
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can create own reports" ON expense_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON expense_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON expense_reports;
DROP POLICY IF EXISTS "Admins can update all reports" ON expense_reports;

-- Create RLS policies for expense_reports table
-- Allow users to view their own reports
CREATE POLICY "Users can view own reports" ON expense_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create their own reports
CREATE POLICY "Users can create own reports" ON expense_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reports
CREATE POLICY "Users can update own reports" ON expense_reports
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to view all reports
CREATE POLICY "Admins can view all reports" ON expense_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update all reports (for approval)
CREATE POLICY "Admins can update all reports" ON expense_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Enable RLS on expense_report_items table
ALTER TABLE expense_report_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own report items" ON expense_report_items;
DROP POLICY IF EXISTS "Admins can view all report items" ON expense_report_items;

-- Create RLS policies for expense_report_items table
-- Allow users to manage their own report items
CREATE POLICY "Users can manage own report items" ON expense_report_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM expense_reports 
            WHERE expense_reports.id = expense_report_items.expense_report_id 
            AND expense_reports.user_id = auth.uid()
        )
    );

-- Allow admins to view all report items
CREATE POLICY "Admins can view all report items" ON expense_report_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Ensure proper status constraint on receipts table
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'error'));

-- Add approval fields if they don't exist
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update any existing 'processed' status to 'approved'
UPDATE receipts SET status = 'approved' WHERE status = 'processed';

-- Create a function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role, department)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
        COALESCE(NEW.raw_user_meta_data->>'department', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 