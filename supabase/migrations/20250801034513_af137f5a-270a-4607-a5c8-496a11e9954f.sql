-- Insert sample builder items
INSERT INTO public.builder_items (name, description, category, price, status) VALUES
('Premium Kitchen Cabinets', 'High-quality oak kitchen cabinets with soft-close hinges', 'Kitchen', 2500.00, 'active'),
('Granite Countertops', 'Premium granite countertops with professional installation', 'Kitchen', 1800.00, 'active'),
('Hardwood Flooring', 'Solid oak hardwood flooring, 3/4 inch thick', 'Flooring', 3200.00, 'active'),
('Stainless Steel Appliances', 'Complete kitchen appliance package - fridge, stove, dishwasher', 'Appliances', 4500.00, 'active'),
('Bathroom Vanity', 'Modern double-sink bathroom vanity with quartz top', 'Bathroom', 1200.00, 'active'),
('LED Lighting Package', 'Energy-efficient LED lighting throughout the home', 'Electrical', 800.00, 'inactive'),
('Crown Molding', 'Decorative crown molding for living areas', 'Trim', 600.00, 'active'),
('Tile Backsplash', 'Subway tile backsplash for kitchen', 'Kitchen', 450.00, 'active');

-- Insert sample homeowner registrations with different statuses
INSERT INTO public.homeowner_registrations (
  user_id, 
  customer_name, 
  customer_email, 
  customer_phone, 
  customer_address, 
  status, 
  selected_items, 
  total_amount,
  created_at
) VALUES
-- Draft registrations
('00000000-0000-0000-0000-000000000001', 'John Smith', 'john.smith@email.com', '(555) 123-4567', '123 Main St, Anytown, ST 12345', 'draft', '["Premium Kitchen Cabinets", "Granite Countertops"]', 4300.00, NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000002', 'Sarah Johnson', 'sarah.j@email.com', '(555) 234-5678', '456 Oak Ave, Springfield, ST 23456', 'draft', '["Hardwood Flooring"]', 3200.00, NOW() - INTERVAL '1 day'),

-- Pending registrations  
('00000000-0000-0000-0000-000000000003', 'Michael Brown', 'mbrown@email.com', '(555) 345-6789', '789 Pine Rd, Riverside, ST 34567', 'pending', '["Stainless Steel Appliances", "Bathroom Vanity"]', 5700.00, NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0000-000000000004', 'Emily Davis', 'emily.davis@email.com', '(555) 456-7890', '321 Elm St, Lakeside, ST 45678', 'pending', '["Crown Molding", "Tile Backsplash", "LED Lighting Package"]', 1850.00, NOW() - INTERVAL '1 day'),

-- Approved registrations
('00000000-0000-0000-0000-000000000005', 'David Wilson', 'dwilson@email.com', '(555) 567-8901', '654 Maple Dr, Hillside, ST 56789', 'approved', '["Premium Kitchen Cabinets", "Granite Countertops", "Stainless Steel Appliances"]', 8800.00, NOW() - INTERVAL '5 days'),
('00000000-0000-0000-0000-000000000006', 'Lisa Martinez', 'lisa.m@email.com', '(555) 678-9012', '987 Cedar Ln, Parkview, ST 67890', 'approved', '["Hardwood Flooring", "Bathroom Vanity"]', 4400.00, NOW() - INTERVAL '4 days'),

-- Sent registrations
('00000000-0000-0000-0000-000000000007', 'James Taylor', 'jtaylor@email.com', '(555) 789-0123', '147 Birch Way, Sunnydale, ST 78901', 'sent', '["Tile Backsplash", "Crown Molding"]', 1050.00, NOW() - INTERVAL '6 days'),

-- Completed registrations
('00000000-0000-0000-0000-000000000008', 'Amanda White', 'awhite@email.com', '(555) 890-1234', '258 Willow St, Greenfield, ST 89012', 'completed', '["Premium Kitchen Cabinets", "Hardwood Flooring", "LED Lighting Package"]', 6400.00, NOW() - INTERVAL '10 days');

-- Insert sample homeowner queries with different statuses
INSERT INTO public.homeowner_queries (
  homeowner_registration_id,
  subject,
  message,
  status,
  response,
  responded_at,
  created_at
) VALUES
-- Open queries
((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'john.smith@email.com'), 
 'Question about cabinet installation', 
 'Hi, I wanted to know more about the installation process for the kitchen cabinets. How long does it typically take?', 
 'open', NULL, NULL, NOW() - INTERVAL '1 day'),

((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'sarah.j@email.com'), 
 'Flooring color options', 
 'Are there different color options available for the hardwood flooring? I would like to see samples if possible.', 
 'open', NULL, NULL, NOW() - INTERVAL '6 hours'),

((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'mbrown@email.com'), 
 'Appliance delivery schedule', 
 'When can I expect the stainless steel appliances to be delivered? I need to coordinate with my contractor.', 
 'open', NULL, NULL, NOW() - INTERVAL '3 hours'),

-- Responded queries
((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'emily.davis@email.com'), 
 'LED lighting warranty', 
 'What kind of warranty comes with the LED lighting package?', 
 'responded', 
 'Hi Emily, the LED lighting package comes with a 5-year manufacturer warranty and 2-year installation warranty. All details will be provided with your final documentation.', 
 NOW() - INTERVAL '2 hours', 
 NOW() - INTERVAL '1 day'),

((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'dwilson@email.com'), 
 'Payment schedule inquiry', 
 'Can you please clarify the payment schedule for my approved items?', 
 'responded', 
 'Hello David, your payment will be split into 3 installments: 30% upon approval, 40% at start of installation, and 30% upon completion. Our finance team will contact you within 2 business days.', 
 NOW() - INTERVAL '1 day', 
 NOW() - INTERVAL '3 days'),

((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'lisa.m@email.com'), 
 'Installation timeline', 
 'How long will the installation take for both the flooring and bathroom vanity?', 
 'responded', 
 'Hi Lisa, the hardwood flooring installation will take 2-3 days, and the bathroom vanity installation will take 1 day. We can schedule them back-to-back or separately based on your preference.', 
 NOW() - INTERVAL '6 hours', 
 NOW() - INTERVAL '2 days'),

-- Closed queries
((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'jtaylor@email.com'), 
 'Project completion confirmation', 
 'I just wanted to confirm that my project has been completed successfully. Everything looks great!', 
 'closed', 
 'Thank you for the confirmation, James! We are glad you are satisfied with the work. Please don not hesitate to reach out if you need anything in the future.', 
 NOW() - INTERVAL '2 days', 
 NOW() - INTERVAL '3 days'),

((SELECT id FROM public.homeowner_registrations WHERE customer_email = 'awhite@email.com'), 
 'Final documentation request', 
 'Could I get copies of all the final documentation and warranties for my records?', 
 'closed', 
 'Absolutely, Amanda! All final documentation, warranties, and care instructions have been emailed to you. You should receive them within the next hour.', 
 NOW() - INTERVAL '1 day', 
 NOW() - INTERVAL '2 days');