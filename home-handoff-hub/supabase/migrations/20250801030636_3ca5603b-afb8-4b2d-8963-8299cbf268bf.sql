-- Create profiles table for builders
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homeowner registrations table
CREATE TABLE public.homeowner_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  property_address TEXT NOT NULL,
  property_city TEXT NOT NULL,
  property_state TEXT NOT NULL,
  property_zip TEXT NOT NULL,
  project_name TEXT,
  notes TEXT,
  selected_items JSONB DEFAULT '{}',
  documents_uploaded JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'documents_pending', 'ready_for_review', 'sent', 'delivered')),
  entitlement_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for homeowner registrations
CREATE POLICY "Builders can view their own registrations" 
ON public.homeowner_registrations 
FOR SELECT 
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can create their own registrations" 
ON public.homeowner_registrations 
FOR INSERT 
WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders can update their own registrations" 
ON public.homeowner_registrations 
FOR UPDATE 
USING (auth.uid() = builder_id);

CREATE POLICY "Builders can delete their own registrations" 
ON public.homeowner_registrations 
FOR DELETE 
USING (auth.uid() = builder_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homeowner_registrations_updated_at
  BEFORE UPDATE ON public.homeowner_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, company_name, contact_person)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'contact_person'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();