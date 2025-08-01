-- Fix sample data for new organization structure

-- First, get the organization ID
DO $$
DECLARE
    org_id UUID;
BEGIN
    -- Get the organization ID
    SELECT id INTO org_id FROM public.builder_organizations LIMIT 1;
    
    -- Update builder_items to have organization_id
    UPDATE public.builder_items 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
    -- Update homeowner_registrations to have organization_id and Australian format
    UPDATE public.homeowner_registrations 
    SET 
        organization_id = org_id,
        customer_phone = CASE 
            WHEN customer_phone = '(555) 123-4567' THEN '0412 345 678'
            WHEN customer_phone = '(555) 234-5678' THEN '0423 456 789'
            WHEN customer_phone = '(555) 345-6789' THEN '0434 567 890'
            WHEN customer_phone = '(555) 456-7890' THEN '0445 678 901'
            WHEN customer_phone = '(555) 567-8901' THEN '0456 789 012'
            WHEN customer_phone = '(555) 678-9012' THEN '0467 890 123'
            WHEN customer_phone = '(555) 789-0123' THEN '0478 901 234'
            WHEN customer_phone = '(555) 890-1234' THEN '0489 012 345'
            ELSE customer_phone
        END,
        property_state = CASE 
            WHEN property_state = 'ST' THEN 'NSW'
            ELSE property_state
        END,
        property_zip = CASE 
            WHEN property_zip = '12345' THEN '2000'
            WHEN property_zip = '23456' THEN '2001'
            WHEN property_zip = '34567' THEN '2002'
            WHEN property_zip = '45678' THEN '2003'
            WHEN property_zip = '56789' THEN '2004'
            WHEN property_zip = '67890' THEN '2005'
            WHEN property_zip = '78901' THEN '2006'
            WHEN property_zip = '89012' THEN '2007'
            ELSE property_zip
        END,
        property_city = CASE 
            WHEN property_city = 'Anytown' THEN 'Sydney'
            WHEN property_city = 'Springfield' THEN 'Parramatta'
            WHEN property_city = 'Riverside' THEN 'Liverpool'
            WHEN property_city = 'Lakeside' THEN 'Bankstown'
            WHEN property_city = 'Hillside' THEN 'Penrith'
            WHEN property_city = 'Parkview' THEN 'Blacktown'
            WHEN property_city = 'Sunnydale' THEN 'Campbelltown'
            WHEN property_city = 'Greenfield' THEN 'Fairfield'
            ELSE property_city
        END
    WHERE organization_id IS NULL;
    
    -- Update homeowner_queries to have organization_id
    UPDATE public.homeowner_queries 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
    -- Update profiles to have organization_id
    UPDATE public.profiles 
    SET organization_id = org_id 
    WHERE organization_id IS NULL;
    
END $$;