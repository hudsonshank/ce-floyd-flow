-- Create enums
CREATE TYPE app_role AS ENUM ('pm', 'admin', 'exec');
CREATE TYPE subcontract_status AS ENUM ('Draft', 'Out for Signature', 'Executed');
CREATE TYPE attachment_type AS ENUM ('F', 'G', 'H', 'COI', 'W9', 'Other');
CREATE TYPE attachment_status AS ENUM ('Missing', 'Pending Review', 'Invalid', 'Complete');
CREATE TYPE severity_level AS ENUM ('info', 'warn', 'error');
CREATE TYPE send_status AS ENUM ('queued', 'sent', 'bounced', 'failed');

-- Users/Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role app_role DEFAULT 'pm' NOT NULL,
  default_filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procore_project_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  number TEXT,
  pm_name TEXT,
  status TEXT,
  start_date DATE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Subcontracts table
CREATE TABLE subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procore_commitment_id TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  subcontractor_name TEXT NOT NULL,
  subcontractor_email TEXT,
  contract_value NUMERIC(15,2),
  contract_date DATE,
  status subcontract_status DEFAULT 'Draft' NOT NULL,
  missing_count INTEGER DEFAULT 0 NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id UUID REFERENCES subcontracts(id) ON DELETE CASCADE NOT NULL,
  type attachment_type NOT NULL,
  status attachment_status DEFAULT 'Missing' NOT NULL,
  file_url TEXT,
  filename TEXT,
  last_validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Validation flags table
CREATE TABLE validation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID REFERENCES attachments(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  severity severity_level DEFAULT 'warn' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id UUID REFERENCES subcontracts(id) ON DELETE CASCADE NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  send_status send_status DEFAULT 'queued' NOT NULL,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_projects_procore_id ON projects(procore_project_id);
CREATE INDEX idx_subcontracts_procore_id ON subcontracts(procore_commitment_id);
CREATE INDEX idx_subcontracts_project_id ON subcontracts(project_id);
CREATE INDEX idx_attachments_subcontract_id ON attachments(subcontract_id);
CREATE INDEX idx_validation_flags_attachment_id ON validation_flags(attachment_id);
CREATE INDEX idx_reminders_subcontract_id ON reminders(subcontract_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for projects (admins see all, PMs see their own)
CREATE POLICY "Admins can view all projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Execs can view all projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'exec')
);
CREATE POLICY "PMs can view their projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'pm' AND (pm_name = email OR pm_name IS NULL))
);
CREATE POLICY "Admins can manage all projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for subcontracts (inherit from projects)
CREATE POLICY "Users can view subcontracts of accessible projects" ON subcontracts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p 
    JOIN profiles pr ON (pr.user_id = auth.uid() AND (pr.role IN ('admin', 'exec') OR p.pm_name = pr.email))
    WHERE p.id = subcontracts.project_id
  )
);
CREATE POLICY "Admins can manage subcontracts" ON subcontracts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for attachments (inherit from subcontracts)
CREATE POLICY "Users can view attachments of accessible subcontracts" ON attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    JOIN profiles pr ON (pr.user_id = auth.uid() AND (pr.role IN ('admin', 'exec') OR p.pm_name = pr.email))
    WHERE sc.id = attachments.subcontract_id
  )
);
CREATE POLICY "Admins and PMs can manage attachments" ON attachments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    JOIN profiles pr ON (pr.user_id = auth.uid() AND pr.role IN ('admin', 'pm'))
    WHERE sc.id = attachments.subcontract_id
  )
);

-- RLS Policies for validation_flags
CREATE POLICY "Users can view flags of accessible attachments" ON validation_flags FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM attachments a
    JOIN subcontracts sc ON sc.id = a.subcontract_id
    JOIN projects p ON p.id = sc.project_id
    JOIN profiles pr ON (pr.user_id = auth.uid())
    WHERE a.id = validation_flags.attachment_id
  )
);

-- RLS Policies for reminders
CREATE POLICY "Users can view reminders of accessible subcontracts" ON reminders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    JOIN profiles pr ON (pr.user_id = auth.uid())
    WHERE sc.id = reminders.subcontract_id
  )
);
CREATE POLICY "Admins and PMs can manage reminders" ON reminders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    JOIN profiles pr ON (pr.user_id = auth.uid() AND pr.role IN ('admin', 'pm'))
    WHERE sc.id = reminders.subcontract_id
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'pm');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();