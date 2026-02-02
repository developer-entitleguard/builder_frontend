-- Add missing columns to builder_items table  
ALTER TABLE public.builder_items 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS price decimal(10,2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Note: For homeowner_registrations and builder_items, we'll create records without foreign key dependencies
-- Insert sample builder items using NULL for builder_id (since no real users exist yet)
INSERT INTO public.builder_items (builder_id, name, description, category, price, status) VALUES
(NULL, 'Premium Kitchen Cabinets', 'High-quality oak kitchen cabinets with soft-close hinges', 'Kitchen', 2500.00, 'active'),
(NULL, 'Granite Countertops', 'Premium granite countertops with professional installation', 'Kitchen', 1800.00, 'active'),
(NULL, 'Hardwood Flooring', 'Solid oak hardwood flooring, 3/4 inch thick', 'Flooring', 3200.00, 'active'),
(NULL, 'Stainless Steel Appliances', 'Complete kitchen appliance package - fridge, stove, dishwasher', 'Appliances', 4500.00, 'active'),
(NULL, 'Bathroom Vanity', 'Modern double-sink bathroom vanity with quartz top', 'Bathroom', 1200.00, 'active'),
(NULL, 'LED Lighting Package', 'Energy-efficient LED lighting throughout the home', 'Electrical', 800.00, 'active'),
(NULL, 'Crown Molding', 'Decorative crown molding for living areas', 'Trim', 600.00, 'active'),
(NULL, 'Tile Backsplash', 'Subway tile backsplash for kitchen', 'Kitchen', 450.00, 'active');

-- Insert sample homeowner registrations 
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
(NULL, 'John Smith', 'john.smith@email.com', '(555) 123-4567', '123 Main St', 'Anytown', 'ST', '12345', 'draft', '["Premium Kitchen Cabinets", "Granite Countertops"]', NOW() - INTERVAL '2 days'),
(NULL, 'Sarah Johnson', 'sarah.j@email.com', '(555) 234-5678', '456 Oak Ave', 'Springfield', 'ST', '23456', 'draft', '["Hardwood Flooring"]', NOW() - INTERVAL '1 day'),

-- Documents pending registrations  
(NULL, 'Michael Brown', 'mbrown@email.com', '(555) 345-6789', '789 Pine Rd', 'Riverside', 'ST', '34567', 'documents_pending', '["Stainless Steel Appliances", "Bathroom Vanity"]', NOW() - INTERVAL '3 days'),
(NULL, 'Emily Davis', 'emily.davis@email.com', '(555) 456-7890', '321 Elm St', 'Lakeside', 'ST', '45678', 'documents_pending', '["Crown Molding", "Tile Backsplash", "LED Lighting Package"]', NOW() - INTERVAL '1 day'),

-- Ready for review registrations
(NULL, 'David Wilson', 'dwilson@email.com', '(555) 567-8901', '654 Maple Dr', 'Hillside', 'ST', '56789', 'ready_for_review', '["Premium Kitchen Cabinets", "Granite Countertops", "Stainless Steel Appliances"]', NOW() - INTERVAL '5 days'),
(NULL, 'Lisa Martinez', 'lisa.m@email.com', '(555) 678-9012', '987 Cedar Ln', 'Parkview', 'ST', '67890', 'ready_for_review', '["Hardwood Flooring", "Bathroom Vanity"]', NOW() - INTERVAL '4 days'),

-- Sent registrations
(NULL, 'James Taylor', 'jtaylor@email.com', '(555) 789-0123', '147 Birch Way', 'Sunnydale', 'ST', '78901', 'sent', '["Tile Backsplash", "Crown Molding"]', NOW() - INTERVAL '6 days'),

-- Delivered registrations
(NULL, 'Amanda White', 'awhite@email.com', '(555) 890-1234', '258 Willow St', 'Greenfield', 'ST', '89012', 'delivered', '["Premium Kitchen Cabinets", "Hardwood Flooring", "LED Lighting Package"]', NOW() - INTERVAL '10 days');