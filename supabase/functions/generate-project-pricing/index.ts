import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectData {
  id: string;
  name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  activities: Array<{
    id: string;
    name: string;
    status: string;
    priority: string;
  }>;
}

interface BOMItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  make?: string;
  model?: string;
  price?: number;
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project } = await req.json() as { project: ProjectData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating pricing for project:", project.name, "ID:", project.id);

    // Fetch BOM items and property details from linked registrations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get registrations linked to this project with property details
    const { data: registrations, error: regError } = await supabase
      .from('homeowner_registrations')
      .select('selected_items, num_bedrooms, num_rooms, total_built_up_area')
      .eq('project_id', project.id);
    
    if (regError) {
      console.error("Error fetching registrations:", regError);
    }

    // Aggregate property details across registrations
    let totalBuiltUpArea = 0;
    let totalBedrooms = 0;
    let totalRooms = 0;
    let registrationCount = 0;

    // Extract BOM items from registrations
    let bomItems: BOMItem[] = [];
    if (registrations && registrations.length > 0) {
      registrationCount = registrations.length;
      for (const reg of registrations) {
        // Aggregate property details
        if (reg.total_built_up_area) totalBuiltUpArea += Number(reg.total_built_up_area);
        if (reg.num_bedrooms) totalBedrooms += Number(reg.num_bedrooms);
        if (reg.num_rooms) totalRooms += Number(reg.num_rooms);
        
        if (reg.selected_items && Array.isArray(reg.selected_items)) {
          bomItems = bomItems.concat(reg.selected_items as BOMItem[]);
        }
      }
      // Remove duplicates by ID
      const uniqueItems = new Map<string, BOMItem>();
      for (const item of bomItems) {
        if (item.id && !uniqueItems.has(item.id)) {
          uniqueItems.set(item.id, item);
        }
      }
      bomItems = Array.from(uniqueItems.values());
    }

    console.log(`Found ${bomItems.length} BOM items from ${registrations?.length || 0} linked registrations`);
    console.log(`Property details: ${totalBuiltUpArea} sqm, ${totalBedrooms} bedrooms, ${totalRooms} rooms`);

    const activitiesList = project.activities.map(a => 
      `- ${a.name} (Status: ${a.status}, Priority: ${a.priority})`
    ).join('\n');

    // Format BOM items for AI prompt
    const bomItemsList = bomItems.length > 0 
      ? bomItems.map(item => {
          const price = item.price ? `$${item.price.toLocaleString()}` : 'Price not specified';
          const brand = item.brand || item.make || 'Unknown brand';
          return `- ${item.name} (${item.category}): ${brand} ${item.model || ''} - ${price}`;
        }).join('\n')
      : 'No BOM items specified';

    const bomTotalCost = bomItems.reduce((sum, item) => sum + (item.price || 0), 0);

    const systemPrompt = `You are an Australian construction cost estimator AI. Generate realistic cost estimates for residential building projects based on current Australian market rates (2024-2025).

You must respond with ONLY a valid JSON object (no markdown, no code blocks) containing cost line items grouped into these categories:
- materials: Building materials like bricks, concrete, timber, steel, roofing, insulation, etc.
- labour: Trade-based labour costs like carpentry, electrical, plumbing, painting, etc.
- subcontractors: Specialized contractor costs like HVAC, landscaping, pool, etc.
- overheads: Regulatory fees, compliance, permits, insurance, site costs, contingency, etc.

Each item should have:
- name: Cost factor name
- description: Brief explanation
- total_cost: Estimated total cost in AUD (number)
- ai_assumptions: Your reasoning for this estimate
- from_bom: Boolean indicating if this item was derived from the Bill of Materials

IMPORTANT: When Bill of Materials (BOM) items are provided, use their actual prices as a baseline for the materials category. For BOM items without prices, estimate based on typical Australian market rates. Always include additional materials, labour, subcontractors, and overheads beyond just the BOM items to provide a complete project estimate.

Base your estimates on:
- Property type and typical scope
- Location-based cost variations (metro vs regional)
- Current Australian building cost indices
- Standard construction practices
- Actual BOM item prices when provided`;

    // Format property details
    const propertyDetails = [];
    if (totalBuiltUpArea > 0) propertyDetails.push(`Total Built-Up Area: ${totalBuiltUpArea} sqm`);
    if (totalBedrooms > 0) propertyDetails.push(`Total Bedrooms: ${totalBedrooms}`);
    if (totalRooms > 0) propertyDetails.push(`Total Rooms: ${totalRooms}`);
    if (registrationCount > 0) propertyDetails.push(`Number of Units/Registrations: ${registrationCount}`);
    
    const propertyDetailsText = propertyDetails.length > 0 
      ? propertyDetails.join('\n')
      : 'No property details specified';

    const userPrompt = `Generate a detailed cost breakdown for this Australian building project:

Project: ${project.name}
Property Type: ${project.property_type}
Location: ${project.city}, ${project.state}
Address: ${project.address}

Property Details from Registrations:
${propertyDetailsText}

Project Activities:
${activitiesList || 'No activities defined yet'}

Bill of Materials (BOM) Items from Linked Registrations:
${bomItemsList}
${bomItems.length > 0 ? `\nTotal BOM Value: $${bomTotalCost.toLocaleString()}` : ''}

Generate realistic cost estimates considering:
1. ${project.property_type} typical build costs in ${project.state}
2. The total built-up area of ${totalBuiltUpArea > 0 ? totalBuiltUpArea + ' sqm' : 'typical size for property type'} - use this to scale material quantities and labour hours
3. Number of rooms (${totalRooms > 0 ? totalRooms : 'estimate based on property type'}) affects fixtures, doors, electrical points, painting, etc.
4. Number of bedrooms (${totalBedrooms > 0 ? totalBedrooms : 'estimate based on property type'}) affects built-in robes, electrical, HVAC sizing
5. USE THE BOM ITEM PRICES AS A BASELINE for materials - include each BOM item as a line item with its actual price
6. For BOM items without prices, estimate based on current Australian market rates
7. Add additional materials not in the BOM that are typically needed for a ${project.property_type}
8. Labour rates for ${project.city} area
9. Required permits and compliance for ${project.state}
10. Link relevant cost items to activities where applicable

Respond with a JSON object with this structure:
{
  "cost_items": [
    {
      "category": "materials",
      "name": "Kitchen Appliance Package",
      "description": "Bosch dishwasher, oven, and rangehood from BOM",
      "total_cost": 5500,
      "ai_assumptions": "Price taken directly from Bill of Materials",
      "linked_activity_name": "Kitchen Fitout",
      "from_bom": true
    },
    {
      "category": "materials",
      "name": "Structural Timber",
      "description": "Framing timber for walls and roof",
      "total_cost": 25000,
      "ai_assumptions": "Based on average ${project.property_type} requiring 15m³ of structural timber at $1,667/m³",
      "linked_activity_name": "Framing",
      "from_bom": false
    }
  ],
  "summary": "Brief explanation including how BOM items were incorporated"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response:", content);

    // Parse the JSON from the response, handling potential markdown code blocks
    let parsedContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Map activity names to IDs
    const activityMap = new Map(project.activities.map(a => [a.name.toLowerCase(), a.id]));
    
    const costItems = parsedContent.cost_items.map((item: any) => ({
      ...item,
      linked_activity_id: item.linked_activity_name 
        ? activityMap.get(item.linked_activity_name.toLowerCase()) || null
        : null,
    }));

    return new Response(JSON.stringify({ 
      cost_items: costItems,
      summary: parsedContent.summary 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-project-pricing:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
