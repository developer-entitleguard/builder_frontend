-- Insert sample builder items
INSERT INTO public.builder_items (builder_id, name, category, brand, model, make, documentation_url, notes) VALUES
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Central Air Conditioning Unit', 'HVAC', 'Carrier', 'Infinity 20', 'Carrier', 'https://docs.carrier.com/infinity-20', 'High-efficiency central air system with smart thermostat'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Gas Water Heater', 'Plumbing', 'Rheem', 'Performance Plus', 'Rheem', 'https://docs.rheem.com/performance-plus', '50-gallon natural gas water heater'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Kitchen Range', 'Appliances', 'GE', 'Profile Series', 'General Electric', 'https://docs.ge.com/profile-range', 'Stainless steel gas range with convection oven'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Refrigerator', 'Appliances', 'Samsung', 'Family Hub', 'Samsung', 'https://docs.samsung.com/family-hub', 'Smart refrigerator with touchscreen display'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Dishwasher', 'Appliances', 'Bosch', 'Ascenta Series', 'Bosch', 'https://docs.bosch.com/ascenta', 'Energy-efficient dishwasher with quiet operation'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Garage Door Opener', 'Hardware', 'LiftMaster', '8500W', 'Chamberlain', 'https://docs.liftmaster.com/8500w', 'WiFi-enabled garage door opener with battery backup'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Hardwood Flooring', 'Flooring', 'Bruce', 'American Treasures', 'Armstrong', 'https://docs.bruce.com/american-treasures', 'Solid oak hardwood flooring with natural finish'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Windows', 'Windows & Doors', 'Andersen', '400 Series', 'Andersen', 'https://docs.andersen.com/400-series', 'Double-hung windows with energy-efficient glass'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Front Door', 'Windows & Doors', 'Therma-Tru', 'Classic-Craft', 'Therma-Tru', 'https://docs.thermatru.com/classic-craft', 'Fiberglass entry door with decorative glass'),
('affe713d-5e2d-4dfb-b1d7-fef61ff0ed33', 'Electrical Panel', 'Electrical', 'Square D', 'QO Series', 'Schneider Electric', 'https://docs.schneider-electric.com/qo-series', '200-amp main breaker panel');

-- Insert sample homeowner registrations with different statuses
INSERT INTO public.homeowner_registrations (
  id, builder_id, customer_name, customer_email, customer_phone, 
  property_address, property_city, property_state, property_zip, 
  project_name, settlement_date, notes, status, 
  selected_items, documents_uploaded, entitlement_sent_at
) VALUES
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'John Smith',
  'john.smith@email.com',
  '555-123-4567',
  '123 Oak Street',
  'Springfield',
  'CA',
  '90210',
  'Sunset Ridge Community',
  '2024-12-15',
  'First-time homebuyer, very excited about the warranty coverage',
  'sent',
  '{"hvac": {"Central Air Conditioning Unit": true}, "appliances": {"Kitchen Range": true, "Refrigerator": true, "Dishwasher": true}}',
  '{"warranty_docs": ["warranty_guide.pdf", "appliance_manuals.pdf"], "inspection_reports": ["final_inspection.pdf"]}',
  '2024-01-15 14:30:00'
),
(
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Sarah Johnson',
  'sarah.johnson@email.com',
  '555-987-6543',
  '456 Pine Avenue',
  'Riverside',
  'CA',
  '92501',
  'Mountain View Estates',
  '2024-11-30',
  'Upgrading from previous home, interested in smart home features',
  'ready_for_review',
  '{"hvac": {"Central Air Conditioning Unit": true}, "appliances": {"Kitchen Range": true, "Refrigerator": true}, "hardware": {"Garage Door Opener": true}}',
  '{"warranty_docs": ["warranty_guide.pdf"], "photos": ["kitchen_completion.jpg", "hvac_installation.jpg"]}',
  null
),
(
  '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Michael Brown',
  'michael.brown@email.com',
  '555-456-7890',
  '789 Maple Drive',
  'Oceanside',
  'CA',
  '92054',
  'Coastal Gardens',
  '2025-01-20',
  'Beach house purchase, concerned about salt air effects on appliances',
  'documents_pending',
  '{"hvac": {"Central Air Conditioning Unit": true}, "plumbing": {"Gas Water Heater": true}, "flooring": {"Hardwood Flooring": true}}',
  '{}',
  null
),
(
  '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Emily Davis',
  'emily.davis@email.com',
  '555-321-0987',
  '321 Cedar Lane',
  'Irvine',
  'CA',
  '92602',
  'Tech Valley Homes',
  '2024-12-01',
  'Tech professional working from home, needs reliable systems',
  'draft',
  '{}',
  '{}',
  null
),
(
  '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Robert Wilson',
  'robert.wilson@email.com',
  '555-654-3210',
  '654 Birch Court',
  'San Diego',
  'CA',
  '92101',
  'Downtown Lofts',
  '2024-10-15',
  'Urban loft conversion, unique warranty requirements',
  'sent',
  '{"appliances": {"Kitchen Range": true, "Refrigerator": true, "Dishwasher": true}, "electrical": {"Electrical Panel": true}}',
  '{"warranty_docs": ["warranty_guide.pdf", "loft_specifications.pdf"], "inspection_reports": ["electrical_inspection.pdf"]}',
  '2024-01-10 09:15:00'
);

-- Insert sample homeowner queries with different statuses
INSERT INTO public.homeowner_queries (
  registration_id, builder_id, subject, message, status, response, responded_at
) VALUES
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'HVAC System Making Unusual Noise',
  'Hi, I noticed that my central air conditioning unit has been making a clicking sound when it starts up. Is this normal? The system seems to be cooling properly, but I wanted to check if this indicates a potential issue covered under warranty.',
  'responded',
  'Thank you for contacting us about your HVAC system. The clicking sound you''re hearing during startup is typically normal and occurs when the system''s contactor engages. However, if the sound becomes louder or more frequent, please let us know. Your Carrier Infinity 20 system is fully covered under warranty. We''ve scheduled a routine inspection for next week to ensure everything is operating optimally.',
  '2024-01-16 10:30:00'
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Dishwasher Not Draining Completely',
  'The Bosch dishwasher sometimes leaves a small amount of water at the bottom after a cycle. I''ve tried running it again, but the issue persists. Could you please advise if this is covered under warranty?',
  'open',
  null,
  null
),
(
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Garage Door Opener Remote Programming',
  'I need help programming additional remotes for the LiftMaster garage door opener. The manual mentions warranty coverage for technical support. Can someone walk me through the process or schedule a service call?',
  'in_progress',
  'We''ve received your request for garage door opener remote programming. Our technician will contact you within 24 hours to schedule a convenient time for the service call. This service is covered under your warranty.',
  '2024-01-14 15:45:00'
),
(
  '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Water Heater Temperature Concerns',
  'The water from our new Rheem water heater doesn''t seem to get as hot as expected. We''ve checked the thermostat setting, but the water temperature feels lukewarm even on the highest setting. Is this a warranty issue?',
  'responded',
  'Thank you for reporting the water temperature issue. This could be related to the thermostat calibration or heating element. We''ve scheduled a service technician to inspect your Rheem Performance Plus water heater. This visit is covered under warranty, and we''ll resolve the issue at no cost to you.',
  '2024-01-13 11:20:00'
),
(
  '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
  'affe713d-5e2d-4dfb-b1d7-fef61ff0ed33',
  'Kitchen Range Burner Ignition Issue',
  'One of the burners on the GE Profile range is having trouble igniting. It takes several attempts before it lights up. The other burners work fine. Is this something that would be covered under the appliance warranty?',
  'open',
  null,
  null
);