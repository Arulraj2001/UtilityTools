-- Logistics & Shipping Tools - Production Seed
-- 6 new calculators for shipping cost, courier charges, air freight, container load, packaging cost, and delivery time

-- Ensure the logistics-shipping category exists
INSERT INTO categories (name, slug, description, icon, color, status, is_featured, sort_order)
VALUES (
  'Logistics & Shipping Tools',
  'logistics-shipping',
  'Industry-ready calculators for shipping costs, courier charges, freight pricing, container planning, packaging, and delivery estimates.',
  'Truck',
  '#0369a1',
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

-- 1. Shipping Cost Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Shipping Cost Calculator',
  'shipping-cost-calculator',
  'Calculate realistic shipping costs based on weight, distance, shipping mode, and surcharges. Supports standard, express, and air freight.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Truck',
  'published',
  true,
  true,
  '[
    {"name":"actual_weight","label":"Actual Weight (kg)","type":"number","placeholder":"12.5","required":true},
    {"name":"volumetric_weight","label":"Volumetric Weight (kg)","type":"number","placeholder":"15.0","required":true},
    {"name":"distance_km","label":"Distance (km)","type":"number","placeholder":"1500","required":true},
    {"name":"shipping_type","label":"Shipping Type","type":"select","options":["standard","express","air"],"default_value":"standard","required":true},
    {"name":"fuel_surcharge","label":"Fuel Surcharge (%)","type":"number","placeholder":"8","default_value":"8","required":true},
    {"name":"insurance","label":"Insurance (%)","type":"number","placeholder":"0","default_value":"0","required":false}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Shipping Cost Calculator – Freight charge estimator for logistics',
  'Calculate shipping costs instantly based on weight, distance, and shipping mode. Get accurate freight quotes for standard, express, and air shipping.',
  'shipping cost calculator, freight quote, shipping charges, logistics calculator, parcel shipping cost',
  '[
    {"question":"How is shipping cost calculated?","answer":"Shipping cost is calculated using chargeable weight (higher of actual vs volumetric), distance-based rates, and surcharges for fuel and insurance."},
    {"question":"What is the difference between actual and volumetric weight?","answer":"Actual weight is the parcel mass. Volumetric weight is calculated from dimensions. Carriers bill using whichever is higher."},
    {"question":"What are typical fuel surcharges?","answer":"Fuel surcharges range from 5-12% depending on current fuel prices and carrier policies. Most carriers update this monthly."},
    {"question":"How do shipping types affect the cost?","answer":"Standard shipping is the most economical but slower. Express is faster with higher charges. Air freight is the fastest and most expensive option."}
  ]'::jsonb,
  $$<h2>Shipping Cost Calculator</h2>
<p>Calculate accurate shipping costs for your freight and parcels. This tool estimates charges based on actual weight, volumetric weight, distance, and shipping mode.</p>
<h2>How to use it</h2>
<ul>
  <li>Enter the parcel's actual weight in kilograms.</li>
  <li>Enter volumetric weight (length × width × height ÷ 5000 for cm-based).</li>
  <li>Specify the shipping distance in kilometers.</li>
  <li>Select your shipping mode: standard, express, or air.</li>
  <li>Add fuel surcharge percentage (typically 8-10%).</li>
  <li>Include insurance percentage if needed.</li>
</ul>
<h2>Industry standard rates</h2>
<p>This calculator uses realistic Indian logistics industry rates:</p>
<ul>
  <li><strong>Standard shipping:</strong> ₹8.50/kg per 100km</li>
  <li><strong>Express shipping:</strong> ₹15/kg per 100km</li>
  <li><strong>Air freight:</strong> ₹35/kg per 100km</li>
</ul>
<h2>When to use this tool</h2>
<p>Use it for freight quotes, cost planning, pricing strategy, and comparing shipping modes. Perfect for e-commerce, logistics businesses, and shipment budgeting.</p>$$,
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
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- 2. Courier Charges Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Courier Charges Calculator',
  'courier-charges-calculator',
  'Estimate courier shipping charges with support for COD fees, express surcharges, and GST calculations for Indian courier services.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Package',
  'published',
  true,
  false,
  '[
    {"name":"package_weight","label":"Package Weight (kg)","type":"number","placeholder":"2.5","required":true},
    {"name":"parcel_type","label":"Parcel Type","type":"select","options":["standard","fragile","document","perishable"],"default_value":"standard","required":true},
    {"name":"delivery_speed","label":"Delivery Speed","type":"select","options":["standard","express","overnight"],"default_value":"standard","required":true},
    {"name":"distance","label":"Distance (km)","type":"number","placeholder":"500","required":true},
    {"name":"cod_amount","label":"COD Amount (₹) - if applicable","type":"number","placeholder":"0","default_value":"0","required":false}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Courier Charges Calculator – Parcel delivery cost estimator',
  'Instantly calculate courier charges for parcels. Includes base charges, weight surcharges, distance charges, COD fees, and GST for Indian couriers.',
  'courier charges calculator, parcel delivery cost, courier estimator, COD fee, shipping charges',
  '[
    {"question":"What is a COD fee?","answer":"COD (Cash on Delivery) is a charge applied by couriers when the recipient pays on delivery. Typically 2-3% of the delivery value."},
    {"question":"Why are fragile parcels more expensive?","answer":"Fragile parcels require special handling, packaging, and care during transit, which increases the courier cost by 30-60%."},
    {"question":"What is the GST on courier charges?","answer":"Courier services are charged 18% GST in India. The calculator includes this in the final amount."},
    {"question":"Which parcel type should I choose?","answer":"Standard for normal items, fragile for breakables, document for papers/envelopes, perishable for food and temperature-sensitive items."}
  ]'::jsonb,
  $$<h2>Courier Charges Calculator</h2>
<p>Calculate exact courier delivery charges for your parcels. This tool accounts for weight, distance, parcel type, delivery speed, and COD fees.</p>
<h2>How it works</h2>
<ol>
  <li>Enter the package weight in kilograms.</li>
  <li>Select the parcel type (standard, fragile, document, perishable).</li>
  <li>Choose delivery speed (standard, express, overnight).</li>
  <li>Specify delivery distance in kilometers.</li>
  <li>Add COD amount if applicable (customer pays on delivery).</li>
</ol>
<h2>Key features</h2>
<ul>
  <li><strong>Weight-based surcharges:</strong> Additional charges per 500g increment.</li>
  <li><strong>Distance charges:</strong> Calculated per km based on parcel type.</li>
  <li><strong>COD support:</strong> Adds 2.5% commission for cash-on-delivery services.</li>
  <li><strong>GST included:</strong> Final amount includes 18% GST.</li>
  <li><strong>Overnight delivery:</strong> 50% surcharge for next-day service.</li>
</ul>
<h2>Best for</h2>
<p>E-commerce businesses, logistics planning, customer quote generation, and shipping cost analysis for different courier providers in India.</p>$$,
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
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- 3. Air Freight Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Air Freight Calculator',
  'air-freight-calculator',
  'Calculate air cargo costs including freight charges, fuel surcharge, handling fees, airport charges, and customs duties.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Plane',
  'published',
  false,
  false,
  '[
    {"name":"actual_weight","label":"Actual Weight (kg)","type":"number","placeholder":"50","required":true},
    {"name":"volumetric_weight","label":"Volumetric Weight (kg)","type":"number","placeholder":"60","required":true},
    {"name":"rate_per_kg","label":"Rate per kg (₹)","type":"number","placeholder":"40","required":true},
    {"name":"fuel_surcharge","label":"Fuel Surcharge (%)","type":"number","placeholder":"10","default_value":"10","required":true},
    {"name":"customs_fee","label":"Customs/Duties (₹)","type":"number","placeholder":"0","default_value":"0","required":false}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Air Freight Calculator – International air cargo cost estimator',
  'Calculate total air freight costs including all surcharges, handling fees, and duties. Perfect for international shipping and time-critical cargo.',
  'air freight calculator, cargo shipping cost, international air shipment, air cargo quote, freight calculator',
  '[
    {"question":"When should I use air freight?","answer":"Use air freight for time-critical, high-value cargo, and international shipments where speed justifies the higher cost (typically 5-10x higher than sea freight)."},
    {"question":"What is volumetric weight in air freight?","answer":"Air freight uses a stricter volumetric divisor (typically 6000 cm³/kg or even 5000) than sea freight due to limited aircraft capacity."},
    {"question":"What are airport charges?","answer":"Airport charges typically run ₹2-5 per kg and cover ground handling, security screening, and airport facility use."},
    {"question":"How much is fuel surcharge for air cargo?","answer":"Fuel surcharges vary with oil prices but typically range 8-15%. Airlines update these monthly based on jet fuel prices."}
  ]'::jsonb,
  $$<h2>Air Freight Calculator</h2>
<p>Calculate comprehensive air cargo costs for international and domestic shipments. This tool includes freight, fuel surcharge, handling, airport charges, and customs duties.</p>
<h2>What's included</h2>
<ul>
  <li><strong>Chargeable weight:</strong> Higher of actual or volumetric weight.</li>
  <li><strong>Freight cost:</strong> Chargeable weight × rate per kg.</li>
  <li><strong>Fuel surcharge:</strong> Percentage based on current oil prices.</li>
  <li><strong>Handling charge:</strong> 2% of freight cost for loading/unloading.</li>
  <li><strong>Airport charges:</strong> ~₹2/kg for ground operations.</li>
  <li><strong>Customs/duties:</strong> Import duties and clearance fees.</li>
  <li><strong>GST:</strong> 5% on air freight (special rate).</li>
</ul>
<h2>How to use</h2>
<ol>
  <li>Enter actual weight and volumetric weight.</li>
  <li>Input the rate per kg (usually 25-100₹/kg depending on route).</li>
  <li>Add current fuel surcharge percentage.</li>
  <li>Include any customs or duty fees.</li>
</ol>
<h2>Pro tip</h2>
<p>Air freight is expensive but fast. Use it for urgent shipments, high-value goods, and time-sensitive exports. For regular shipments, consider sea freight or rail.</p>$$,
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
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- 4. Container Load Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Container Load Calculator',
  'container-load-calculator',
  'Estimate how many packages fit in a shipping container and calculate space utilization for 20ft, 40ft, and 40ft high cube containers.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Container',
  'published',
  true,
  false,
  '[
    {"name":"package_length","label":"Package Length","type":"number","placeholder":"100","required":true},
    {"name":"package_width","label":"Package Width","type":"number","placeholder":"80","required":true},
    {"name":"package_height","label":"Package Height","type":"number","placeholder":"60","required":true},
    {"name":"unit","label":"Unit","type":"select","options":["cm","m","in","ft"],"default_value":"cm","required":true},
    {"name":"quantity","label":"Number of Packages","type":"number","placeholder":"100","required":true},
    {"name":"container_type","label":"Container Type","type":"select","options":["20ft","40ft","40hq"],"default_value":"40ft","required":true}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Container Load Calculator – Cargo space utilization planner',
  'Calculate space utilization and estimate how many packages fit in 20ft, 40ft, and high cube containers. Perfect for logistics and freight planning.',
  'container load calculator, cargo space planner, shipping container estimator, container utilization',
  '[
    {"question":"What is a 40ft high cube container?","answer":"A 40HQ (High Cube) container is taller than a standard 40ft container (2.7m vs 2.39m) allowing more stacking capacity."},
    {"question":"How much volume does a 20ft container hold?","answer":"A 20ft container holds 33.1 cubic meters. A 40ft holds 67.7 m³ and a 40HQ holds 76.3 m³."},
    {"question":"What is the ideal container utilization?","answer":"Aim for 80-95% utilization. Below 70% means you could consolidate with other shipments. Above 95% leaves no buffer."},
    {"question":"Can packages be stacked?","answer":"Yes, most packages can be stacked. This calculator estimates fit for standard stacking in all three dimensions."}
  ]'::jsonb,
  $$<h2>Container Load Calculator</h2>
<p>Optimize your container loading and plan shipments efficiently. Calculate space utilization and maximum package capacity for standard and high cube containers.</p>
<h2>Container types supported</h2>
<ul>
  <li><strong>20ft:</strong> 5.9m × 2.35m × 2.39m = 33.1 m³</li>
  <li><strong>40ft:</strong> 12.0m × 2.35m × 2.39m = 67.7 m³</li>
  <li><strong>40HQ:</strong> 12.0m × 2.35m × 2.70m = 76.3 m³ (high cube, extra height)</li>
</ul>
<h2>How to use</h2>
<ol>
  <li>Enter package dimensions (length, width, height).</li>
  <li>Specify the unit type (cm, meters, inches, feet).</li>
  <li>Enter the total number of packages you're shipping.</li>
  <li>Select your container type (20ft, 40ft, or 40HQ).</li>
</ol>
<h2>Results explained</h2>
<ul>
  <li><strong>Utilization %:</strong> How much of container volume your cargo uses.</li>
  <li><strong>Maximum fit:</strong> Maximum packages that could fit.</li>
  <li><strong>Unused volume:</strong> Wasted space in the container.</li>
  <li><strong>Recommendations:</strong> Consolidation advice based on utilization.</li>
</ul>$$,
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
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- 5. Packaging Cost Calculator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Packaging Cost Calculator',
  'packaging-cost-calculator',
  'Calculate total packaging expenses including boxes, tape, filler, and labels. Plan monthly packaging budgets for e-commerce operations.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Box',
  'published',
  false,
  false,
  '[
    {"name":"box_cost","label":"Box Cost (₹)","type":"number","placeholder":"15","required":true},
    {"name":"tape_cost","label":"Tape Cost (₹)","type":"number","placeholder":"2","required":true},
    {"name":"filler_cost","label":"Filler/Padding Cost (₹)","type":"number","placeholder":"3","required":true},
    {"name":"label_cost","label":"Label Cost (₹)","type":"number","placeholder":"1","required":true},
    {"name":"quantity","label":"Number of Packages","type":"number","placeholder":"100","required":true}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Packaging Cost Calculator – E-commerce packaging budget planner',
  'Calculate packaging costs per unit and monthly expenses. Perfect for e-commerce, logistics, and supply chain planning.',
  'packaging cost calculator, box cost estimator, e-commerce packaging, shipping materials cost',
  '[
    {"question":"What should I include in packaging cost?","answer":"Include boxes, tape, bubble wrap/padding, foam, labels, stickers, and any other protective materials used per shipment."},
    {"question":"How do I reduce packaging costs?","answer":"Bulk buying reduces per-unit costs by 20-30%. Also consider eco-friendly alternatives which are often cheaper than specialty packaging."},
    {"question":"What is the typical packaging cost per order?","answer":"For standard e-commerce packages, packaging typically costs ₹20-50 per unit including box, tape, and filler."},
    {"question":"Can I include branding in the calculator?","answer":"Yes, if you use branded boxes, printed tape, or custom labels, include those costs in the respective fields."}
  ]'::jsonb,
  $$<h2>Packaging Cost Calculator</h2>
<p>Accurately calculate packaging costs for your e-commerce or logistics business. Plan budgets and optimize spending on shipping materials.</p>
<h2>How it works</h2>
<ol>
  <li>Enter the cost of each box type.</li>
  <li>Add cost for packaging tape.</li>
  <li>Include cost for fillers (bubble wrap, foam, crumpled paper).</li>
  <li>Add label cost (shipping or product labels).</li>
  <li>Enter the quantity of packages.</li>
</ol>
<h2>Features</h2>
<ul>
  <li><strong>Per-unit cost:</strong> Shows packaging cost for a single package.</li>
  <li><strong>Total cost:</strong> Complete cost for your entire batch.</li>
  <li><strong>Monthly estimate:</strong> Projects costs for typical monthly shipment volume.</li>
  <li><strong>Cost breakdown:</strong> See where most of your packaging money goes.</li>
  <li><strong>Budget planning:</strong> Identify cost-saving opportunities.</li>
</ul>
<h2>Pro tips</h2>
<ul>
  <li>Bulk buying can reduce packaging costs by 25-35%.</li>
  <li>Eco-friendly packaging is often cheaper and improves brand image.</li>
  <li>Standardize box sizes to reduce waste and inventory complexity.</li>
  <li>Negotiate with suppliers for volume discounts.</li>
</ul>$$,
  '[]'::jsonb,
  14
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
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- 6. Delivery Time Estimator
INSERT INTO tools (
  name, slug, description, category_id, icon, status, is_featured, is_trending,
  input_fields, formula_type, formula_config, output_type,
  seo_title, seo_description, seo_keywords, faq, seo_content, related_tool_ids, sort_order
)
VALUES (
  'Delivery Time Estimator',
  'delivery-time-estimator',
  'Estimate delivery times for ground, express, and air shipments. Get realistic arrival dates based on distance and shipping mode.',
  (SELECT id FROM categories WHERE slug = 'logistics-shipping'),
  'Clock',
  'published',
  true,
  false,
  '[
    {"name":"origin","label":"Origin City/Region","type":"text","placeholder":"Delhi","required":false},
    {"name":"destination","label":"Destination City/Region","type":"text","placeholder":"Mumbai","required":false},
    {"name":"distance_km","label":"Distance (km)","type":"number","placeholder":"1500","required":true},
    {"name":"shipping_mode","label":"Shipping Mode","type":"select","options":["ground","express","air"],"default_value":"ground","required":true},
    {"name":"express_option","label":"Express/Fast Option","type":"checkbox","default_value":"false","required":false}
  ]'::jsonb,
  'builtin',
  '{}'::jsonb,
  'cards',
  'Delivery Time Estimator – Shipping transit time calculator',
  'Estimate realistic delivery timeframes for ground, express, and air shipments. Calculate arrival dates based on distance and shipping mode.',
  'delivery time calculator, shipping time estimator, transit time, delivery date estimator',
  '[
    {"question":"How accurate is the delivery estimate?","answer":"Estimates are 85-90% accurate for normal conditions. Holidays, weekends, and unforeseen delays can add 1-3 days."},
    {"question":"What is the difference between express and ground shipping?","answer":"Express uses faster routing and prioritized handling (1-3 days). Ground uses standard routes (2-7 days). Air is fastest (1-4 days)."},
    {"question":"Does the calculator account for weekends?","answer":"The calculator adds a small buffer for weekends and holidays (8% of max days) to provide realistic expectations."},
    {"question":"What factors affect delivery time?","answer":"Distance, shipping mode, current shipment volume, weather, customs clearance (for international), and unforeseen delays."}
  ]'::jsonb,
  $$<h2>Delivery Time Estimator</h2>
<p>Get realistic delivery estimates for your shipments. Calculate arrival dates based on distance, shipping mode, and service level.</p>
<h2>Shipping modes available</h2>
<ul>
  <li><strong>Ground:</strong> Standard 2-5 day delivery depending on distance. Most economical option.</li>
  <li><strong>Express:</strong> Faster routing, 1-3 days. Higher cost but guaranteed timeframe.</li>
  <li><strong>Air:</strong> Fastest option, 1-4 days. Premium rate for time-critical shipments.</li>
</ul>
<h2>How estimates work</h2>
<ul>
  <li>Minimum days: Fastest realistic delivery under ideal conditions.</li>
  <li>Maximum days: Accounts for normal delays and weekend processing.</li>
  <li>Arrival window: Shows earliest and latest possible delivery dates.</li>
  <li>Reliability: Service reliability percentage based on mode and distance.</li>
</ul>
<h2>When to use each mode</h2>
<ul>
  <li><strong>Ground:</strong> Regular shipments, non-urgent items, cost-sensitive.</li>
  <li><strong>Express:</strong> Time-sensitive goods, weekend delivery needed, perishables.</li>
  <li><strong>Air:</strong> Urgent international shipments, high-value goods, emergency supplies.</li>
</ul>
<h2>Pro tip</h2>
<p>Always communicate the maximum delivery date to customers and deliver early when possible to exceed expectations.</p>$$,
  '[]'::jsonb,
  15
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
    output_type = EXCLUDED.output_type,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    seo_keywords = EXCLUDED.seo_keywords,
    faq = EXCLUDED.faq,
    seo_content = EXCLUDED.seo_content,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
