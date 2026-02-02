-- Temporarily allow NULL values for builder_id to insert sample data
ALTER TABLE public.builder_items ALTER COLUMN builder_id DROP NOT NULL;
ALTER TABLE public.homeowner_registrations ALTER COLUMN builder_id DROP NOT NULL;

-- Add missing columns to builder_items table  
ALTER TABLE public.builder_items 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS price decimal(10,2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Insert sample builder items
INSERT INTO public.builder_items (name, description, category, price, status) VALUES
('Premium Kitchen Cabinets', 'High-quality oak kitchen cabinets with soft-close hinges', 'Kitchen', 2500.00, 'active'),
('Granite Countertops', 'Premium granite countertops with professional installation', 'Kitchen', 1800.00, 'active'),
('Hardwood Flooring', 'Solid oak hardwood flooring, 3/4 inch thick', 'Flooring', 3200.00, 'active'),
('Stainless Steel Appliances', 'Complete kitchen appliance package - fridge, stove, dishwasher', 'Appliances', 4500.00, 'active'),
('Bathroom Vanity', 'Modern double-sink bathroom vanity with quartz top', 'Bathroom', 1200.00, 'active'),
('LED Lighting Package', 'Energy-efficient LED lighting throughout the home', 'Electrical', 800.00, 'active'),
('Crown Molding', 'Decorative crown molding for living areas', 'Trim', 600.00, 'active'),
('Tile Backsplash', 'Subway tile backsplash for kitchen', 'Kitchen', 450.00, 'active');

-- Insert sample homeowner registrations 
INSERT INTO public.homeowner_registrations (
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
('John Smith', 'john.smith@email.com', '(555) 123-4567', '123 Main St', 'Anytown', 'ST', '12345', 'draft', '["Premium Kitchen Cabinets", "Granite Countertops"]', NOW() - INTERVAL '2 days'),
('Sarah Johnson', 'sarah.j@email.com', '(555) 234-5678', '456 Oak Ave', 'Springfield', 'ST', '23456', 'draft', '["Hardwood Flooring"]', NOW() - INTERVAL '1 day'),

-- Documents pending registrations  
('Michael Brown', 'mbrown@email.com', '(555) 345-6789', '789 Pine Rd', 'Riverside', 'ST', '34567', 'documents_pending', '["Stainless Steel Appliances", "Bathroom Vanity"]', NOW() - INTERVAL '3 days'),
('Emily Davis', 'emily.davis@email.com', '(555) 456-7890', '321 Elm St', 'Lakeside', 'ST', '45678', 'documents_pending', '["Crown Molding", "Tile Backsplash", "LED Lighting Package"]', NOW() - INTERVAL '1 day'),

-- Ready for review registrations
('David Wilson', 'dwilson@email.com', '(555) 567-8901', '654 Maple Dr', 'Hillside', 'ST', '56789', 'ready_for_review', '["Premium Kitchen Cabinets", "Granite Countertops", "Stainless Steel Appliances"]', NOW() - INTERVAL '5 days'),
('Lisa Martinez', 'lisa.m@email.com', '(555) 678-9012', '987 Cedar Ln', 'Parkview', 'ST', '67890', 'ready_for_review', '["Hardwood Flooring", "Bathroom Vanity"]', NOW() - INTERVAL '4 days'),

-- Sent registrations
('James Taylor', 'jtaylor@email.com', '(555) 789-0123', '147 Birch Way', 'Sunnydale', 'ST', '78901', 'sent', '["Tile Backsplash", "Crown Molding"]', NOW() - INTERVAL '6 days'),

-- Delivered registrations
('Amanda White', 'awhite@email.com', '(555) 890-1234', '258 Willow St', 'Greenfield', 'ST', '89012', 'delivered', '["Premium Kitchen Cabinets", "Hardwood Flooring", "LED Lighting Package"]', NOW() - INTERVAL '10 days');