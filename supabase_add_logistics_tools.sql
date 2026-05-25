-- Seed category and production-ready logistics & shipping tools

INSERT INTO categories (name, slug, description, icon, color, status, is_featured, sort_order)
VALUES (
  'Logistics & Shipping Tools',
  'logistics-shipping',
  'Industry-ready calculators for parcel dimensions, cubic meters, volumetric weight and chargeable shipping weight.',
  'Package',
  '#0f766e',
  'active',
  true,
  95
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- Volumetric Weight Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Volumetric Weight Calculator',
  'volumetric-weight-calculator',
  'Calculate freight volumetric weight from parcel dimensions using standard airline and courier divisors.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Package',
  'published',
  true,
  true,
  '[
    {"name":"length","label":"Length","type":"number","placeholder":"50","required":true},
    {"name":"width","label":"Width","type":"number","placeholder":"40","required":true},
    {"name":"height","label":"Height","type":"number","placeholder":"30","required":true},
    {"name":"unit","label":"Unit","type":"select","options":["cm","m","in"],"default_value":"cm","required":true},
    {"name":"divisor","label":"Volumetric Divisor","type":"number","placeholder":"5000","default_value":"5000","required":true}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Volumetric Weight Calculator – Freight volume to billable weight converter',
  'Calculate volumetric weight from parcel dimensions for cargo and courier billing. Use this tool to compare actual package weight with volumetric weight in kg.',
  'volumetric weight, shipping calculator, freight calculator, cargo chargeable weight',
  '[
    {"question":"What is volumetric weight?","answer":"Volumetric weight is the billable weight determined from parcel dimensions when cargo takes up more space than its actual mass."},
    {"question":"Which divisor should I use?","answer":"Use 5000 for cm-based calculations and 166 for inches-based freight. Some airlines and couriers may use 4000 or 6000 for specific services."},
    {"question":"Why does volumetric weight matter?","answer":"Carriers bill by whichever is greater: actual weight or volumetric weight, so this calculator helps you estimate the cost of bulky shipments."}
  ]'::jsonb,
  $$<h2>Volumetric Weight Calculator</h2>
<p>Use this logistics calculator to convert parcel dimensions into a billable freight weight. Enter the package length, width and height in centimeters, meters or inches, and choose the divisor used by your carrier.</p>
<h2>How to use it</h2>
<ul>
  <li>Enter the package dimensions.</li>
  <li>Select the unit type used by your shipment.</li>
  <li>Use the carrier divisor to match the freight service rate.</li>
</ul>
<h2>Why this matters</h2>
<p>For air freight and express couriers, bulky packages can be charged by volume rather than actual mass. This calculator gives a fast industry-standard estimate.</p>$$,
  '[]'::jsonb,
  10
)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    icon = EXCLUDED.icon,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    is_trending = EXCLUDED.is_trending,
    input_fields = EXCLUDED.input_fields,
    formula_type = EXCLUDED.formula_type,
    formula_config = EXCLUDED.formula_config,
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    related_tool_ids = EXCLUDED.related_tool_ids,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- Chargeable Weight Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Chargeable Weight Calculator',
  'chargeable-weight-calculator',
  'Compare actual parcel weight against volumetric weight to determine the billable shipping weight.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Scale',
  'published',
  true,
  false,
  '[
    {"name":"actual_weight_kg","label":"Actual Weight (kg)","type":"number","placeholder":"12","required":true},
    {"name":"length","label":"Length","type":"number","placeholder":"50","required":true},
    {"name":"width","label":"Width","type":"number","placeholder":"40","required":true},
    {"name":"height","label":"Height","type":"number","placeholder":"30","required":true},
    {"name":"unit","label":"Unit","type":"select","options":["cm","m","in"],"default_value":"cm","required":true},
    {"name":"divisor","label":"Volumetric Divisor","type":"number","placeholder":"5000","default_value":"5000","required":true}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Chargeable Weight Calculator – Actual vs volumetric freight billing',
  'Calculate the chargeable shipping weight by comparing actual parcel mass with volumetric weight. Use this tool for air freight, express cargo and courier pricing.',
  'chargeable weight, billable weight, volumetric weight, shipping calculator',
  '[
    {"question":"What is chargeable weight?","answer":"Chargeable weight is the higher of actual shipment weight and volumetric weight. Carriers use it to determine the final freight charge."},
    {"question":"When does volumetric weight apply?","answer":"Volumetric weight applies when a package uses a lot of space relative to its mass, common in lightweight but bulky shipments."},
    {"question":"How do I choose a divisor?","answer":"Choose a divisor that matches your carrier’s published rate table. 5000 is common for cm-based shipments and 166 for inches-based cargo."}
  ]'::jsonb,
  $$<h2>Chargeable Weight Calculator</h2>
<p>Use this tool to calculate the freight billing weight for parcels. If the volumetric weight exceeds the actual weight, carriers will bill using the volumetric figure.</p>
<h2>How it works</h2>
<ul>
  <li>Input the actual parcel weight in kilograms.</li>
  <li>Enter parcel dimensions and unit type.</li>
  <li>The tool compares actual weight with volumetric weight to return the billable value.</li>
</ul>
<h2>Shipping tip</h2>
<p>When packing lightweight but large parcels, volumetric weight often determines cost. Compare both values before booking shipment.</p>$$,
  '[]'::jsonb,
  11
)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    icon = EXCLUDED.icon,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    is_trending = EXCLUDED.is_trending,
    input_fields = EXCLUDED.input_fields,
    formula_type = EXCLUDED.formula_type,
    formula_config = EXCLUDED.formula_config,
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    related_tool_ids = EXCLUDED.related_tool_ids,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- CBM Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'CBM Calculator',
  'cbm-calculator',
  'Calculate cargo cubic meters from parcel dimensions for freight, container planning and logistics forecasting.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Cube',
  'published',
  false,
  false,
  '[
    {"name":"length","label":"Length","type":"number","placeholder":"1.2","required":true},
    {"name":"width","label":"Width","type":"number","placeholder":"0.8","required":true},
    {"name":"height","label":"Height","type":"number","placeholder":"1.0","required":true},
    {"name":"unit","label":"Unit","type":"select","options":["m","cm","in"],"default_value":"m","required":true}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'CBM Calculator – Cargo dimensions to cubic meters for logistics planning',
  'Convert parcel dimensions into cubic meters for container loading, freight booking and transport planning. Use this logistics tool to estimate cargo volume quickly.',
  'cbm calculator, cubic meters, freight volume, logistics calculator',
  '[
    {"question":"What is CBM?","answer":"CBM is cubic meter volume and is used to calculate cargo space for freight, container and warehouse planning."},
    {"question":"When should I use a CBM calculator?","answer":"Use it when booking sea freight, air cargo or warehousing so you can estimate how much space a shipment will occupy."},
    {"question":"How do I convert parcel dimensions to CBM?","answer":"Multiply the package length, width and height in meters to get the total cubic meters."}
  ]'::jsonb,
  $$<h2>CBM Calculator</h2>
<p>Calculate the cubic meter volume of a parcel using standard logistics units. This is useful for freight booking, container loading and space planning.</p>
<h2>Use this tool when</h2>
<ul>
  <li>You want to compare cargo volume for different package sizes.</li>
  <li>You need a quick estimate for sea, air or road freight planning.</li>
  <li>You are preparing shipment documentation or warehousing requirements.</li>
</ul>
<h2>Practical example</h2>
<p>If your parcel is 1.2 m x 0.8 m x 1.0 m, the CBM is 0.96 cubic meters. This helps carriers and warehouse teams plan the space required.</p>$$,
  '[]'::jsonb,
  12
)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    icon = EXCLUDED.icon,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    is_trending = EXCLUDED.is_trending,
    input_fields = EXCLUDED.input_fields,
    formula_type = EXCLUDED.formula_type,
    formula_config = EXCLUDED.formula_config,
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    related_tool_ids = EXCLUDED.related_tool_ids,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- Parcel Dimension Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Parcel Dimension Calculator',
  'parcel-dimension-calculator',
  'Calculate package volume and resolve a missing dimension from a target cargo volume or shipping weight.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Layers',
  'published',
  false,
  false,
  '[
    {"name":"length","label":"Length","type":"number","placeholder":"50","required":false},
    {"name":"width","label":"Width","type":"number","placeholder":"40","required":false},
    {"name":"height","label":"Height","type":"number","placeholder":"30","required":false},
    {"name":"unit","label":"Unit","type":"select","options":["cm","m","in"],"default_value":"cm","required":true},
    {"name":"target_volume_m3","label":"Target Volume (m³)","type":"number","placeholder":"0.05","required":false},
    {"name":"target_weight_kg","label":"Target Weight (kg)","type":"number","placeholder":"12","required":false},
    {"name":"divisor","label":"Volumetric Divisor","type":"number","placeholder":"5000","default_value":"5000","required":false}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Parcel Dimension Calculator – Cargo dimension planner and missing parcel side finder',
  'Solve parcel dimension problems for logistics. Calculate volume, volumetric weight or determine a missing length, width or height based on target volume or weight.',
  'parcel dimension calculator, missing dimension calculator, shipping volume, logistics planning',
  '[
    {"question":"What can I do with a parcel dimension calculator?","answer":"You can calculate the total parcel volume, estimate volumetric weight, or determine a missing side when two dimensions and a target volume or weight are known."},
    {"question":"How do I use target volume?","answer":"Provide two package dimensions and the required cubic volume in cubic meters. The tool will calculate the missing dimension."},
    {"question":"Should I use actual weight or target weight?","answer":"Use target weight if you want the parcel to meet a specific billable freight weight. Otherwise use volume to compute package dimensions directly."}
  ]'::jsonb,
  $$<h2>Parcel Dimension Calculator</h2>
<p>Calculate parcel volume and resolve a missing dimension for logistics planning. This tool is helpful when you know two package dimensions and need the third to match a target volume or billable weight.</p>
<h2>Features</h2>
<ul>
  <li>Compute parcel volume from three dimensions.</li>
  <li>Calculate the missing length, width or height for a required ship volume.</li>
  <li>Estimate volumetric weight for logistics and cargo pricing.</li>
</ul>
<h2>When to use it</h2>
<p>Use it while designing packaging, booking freight or planning container loads to ensure your parcel dimensions meet shipment and weight requirements.</p>$$,
  '[]'::jsonb,
  13
)
ON CONFLICT (slug) DO UPDATE
SET description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    icon = EXCLUDED.icon,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    is_trending = EXCLUDED.is_trending,
    input_fields = EXCLUDED.input_fields,
    formula_type = EXCLUDED.formula_type,
    formula_config = EXCLUDED.formula_config,
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    related_tool_ids = EXCLUDED.related_tool_ids,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
