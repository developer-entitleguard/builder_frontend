-- First create a sample profile to satisfy foreign key constraints
INSERT INTO public.profiles (user_id, company_name, contact_person) VALUES
('00000000-0000-0000-0000-000000000001', 'Sample Builder Co.', 'John Builder');

-- Add missing columns to builder_items table  
ALTER TABLE public.builder_items 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS price decimal(10,2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Insert sample builder items
INSERT INTO public.builder_items (builder_id, name, description, category, price, status) VALUES
('00000000-0000-0000-0000-000000000001', 'Premium Kitchen Cabinets', 'High-quality oak kitchen cabinets with soft-close hinges', 'Kitchen', 2500.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'Granite Countertops', 'Premium granite countertops with professional installation', 'Kitchen', 1800.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'Hardwood Flooring', 'Solid oak hardwood flooring, 3/4 inch thick', 'Flooring', 3200.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'Stainless Steel Appliances', 'Complete kitchen appliance package - fridge, stove, dishwasher', 'Appliances', 4500.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'Bathroom Vanity', 'Modern double-sink bathroom vanity with quartz top', 'Bathroom', 1200.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'LED Lighting Package', 'Energy-efficient LED lighting throughout the home', 'Electrical', 800.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'Crown Molding', 'Decorative crown molding for living areas', 'Trim', 600.00, 'active'),
('00000000-0000-0000-0000-000000000001', 'Tile Backsplash', 'Subway tile backsplash for kitchen', 'Kitchen', 450.00, 'active');

-- Insert sample homeowner registrations with valid status values
INSERT INTO public.homeowner_registrations (
  builder_id, 
  customer_name, 
  customer_email, 
  customer_phone, 
  property_address,
  property_city,
  property_state,
  property_zip,
  status, 
  selected_items,
  created_at
) VALUES
-- Draft registrations
('00000000-0000-0000-0000-000000000001', 'John Smith', 'john.smith@email.com', '(555) 123-4567', '123 Main St', 'Anytown', 'ST', '12345', 'draft', '["Premium Kitchen Cabinets", "Granite Countertops"]', NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000001', 'Sarah Johnson', 'sarah.j@email.com', '(555) 234-5678', '456 Oak Ave', 'Springfield', 'ST', '23456', 'draft', '["Hardwood Flooring"]', NOW() - INTERVAL '1 day'),

-- Documents pending registrations  
('00000000-0000-0000-0000-000000000001', 'Michael Brown', 'mbrown@email.com', '(555) 345-6789', '789 Pine Rd', 'Riverside', 'ST', '34567', 'documents_pending', '["Stainless Steel Appliances", "Bathroom Vanity"]', NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0000-000000000001', 'Emily Davis', 'emily.davis@email.com', '(555) 456-7890', '321 Elm St', 'Lakeside', 'ST', '45678', 'documents_pending', '["Crown Molding", "Tile Backsplash", "LED Lighting Package"]', NOW() - INTERVAL '1 day'),

-- Ready for review registrations
('00000000-0000-0000-0000-000000000001', 'David Wilson', 'dwilson@email.com', '(555) 567-8901', '654 Maple Dr', 'Hillside', 'ST', '56789', 'ready_for_review', '["Premium Kitchen Cabinets", "Granite Countertops", "Stainless Steel Appliances"]', NOW() - INTERVAL '5 days'),
('00000000-0000-0000-0000-000000000001', 'Lisa Martinez', 'lisa.m@email.com', '(555) 678-9012', '987 Cedar Ln', 'Parkview', 'ST', '67890', 'ready_for_review', '["Hardwood Flooring", "Bathroom Vanity"]', NOW() - INTERVAL '4 days'),

-- Sent registrations
('00000000-0000-0000-0000-000000000001', 'James Taylor', 'jtaylor@email.com', '(555) 789-0123', '147 Birch Way', 'Sunnydale', 'ST', '78901', 'sent', '["Tile Backsplash", "Crown Molding"]', NOW() - INTERVAL '6 days'),

-- Delivered registrations
('00000000-0000-0000-0000-000000000001', 'Amanda White', 'awhite@email.com', '(555) 890-1234', '258 Willow St', 'Greenfield', 'ST', '89012', 'delivered', '["Premium Kitchen Cabinets", "Hardwood Flooring", "LED Lighting Package"]', NOW() - INTERVAL '10 days');