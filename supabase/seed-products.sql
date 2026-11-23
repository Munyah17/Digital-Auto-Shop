-- ============================================================
-- Digital Auto Shop — Product Seed
-- Tech & Vehicle Accessories. Prices in USD.
-- Run this ONCE in your Supabase SQL editor (after schema.sql).
-- tags: bestseller | premium | hightech | accessories
-- These map to the 5 home-page sections.
-- ============================================================

-- ── 1. Products ──────────────────────────────────────────────

INSERT INTO public.products
  (name, slug, description, short_description, price, category_id,
   stock_quantity, is_featured, is_active, tags, specs)
VALUES

-- ── CAR ELECTRONICS ──────────────────────────────────────────
('4K Dual Dash Cam — Front & Rear',
 '4k-dual-dash-cam',
 'Ultra HD 4K front camera with 1080p rear camera. Night vision, G-sensor, loop recording, parking monitor and WiFi app control. Captures every detail of your drive.',
 '4K front + 1080p rear, night vision, WiFi app',
 89.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 8, true, true, ARRAY['premium','hightech'],
 '{"resolution":"4K + 1080p","view":"170° wide","storage":"microSD up to 128GB","features":"WiFi, G-sensor, Parking mode"}'::jsonb),

('7" Wireless CarPlay & Android Auto Display',
 '7-carplay-android-auto-display',
 'Portable 7-inch touchscreen that adds wireless CarPlay and Android Auto to any vehicle. Bluetooth audio, mirror link, reverse camera input, suction mount — no head-unit swap needed.',
 'Wireless CarPlay + Android Auto for any car',
 79.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 6, true, true, ARRAY['premium','hightech'],
 '{"display":"7 inch IPS touch","connectivity":"Wireless CarPlay/Android Auto, BT, AUX","extras":"Reverse cam input, FM transmit"}'::jsonb),

('OBD2 Bluetooth Diagnostic Scanner',
 'obd2-bluetooth-scanner',
 'Plug-in OBD2 scanner that reads and clears engine fault codes from your phone. Works with Torque, OBD Auto Doctor and most Android/iOS apps. Live data: RPM, coolant temp, fuel trim.',
 'Read & clear engine fault codes from your phone',
 18.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 30, false, true, ARRAY['bestseller','hightech'],
 '{"protocol":"OBD-II / EOBD","connection":"Bluetooth 4.0","compatibility":"Most 2008+ vehicles"}'::jsonb),

('66W USB-C + USB-A Car Fast Charger',
 '66w-dual-car-charger',
 'Dual-port metal car charger delivering 66W PD + QC3.0. Charges a phone to 60% in 30 minutes. LED voltage display shows your battery health while you drive.',
 '66W PD + QC3.0 dual-port metal car charger',
 9.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 50, false, true, ARRAY['bestseller','accessories'],
 '{"output":"66W PD + QC3.0","ports":"USB-C + USB-A","display":"LED voltage meter"}'::jsonb),

('Bluetooth 5.0 FM Transmitter Car Kit',
 'bt-fm-transmitter-car-kit',
 'Stream music and take calls through your FM radio. Dual USB charging, U-disk/TF playback, hands-free calling with noise reduction, and 7-colour ambient light.',
 'Music + calls through any FM radio',
 12.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 40, false, true, ARRAY['bestseller','accessories'],
 '{"bluetooth":"5.0","charging":"2x USB (3.1A)","playback":"BT / TF / U-disk","mic":"Built-in CVC noise reduction"}'::jsonb),

('Solar TPMS Tyre Pressure Monitor',
 'solar-tpms-tyre-pressure',
 'Solar-powered wireless tyre pressure monitoring system with 4 external sensors. Real-time pressure + temperature alarms on a colour LCD that charges on your dashboard.',
 'Real-time tyre pressure & temperature alarms',
 35.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 12, false, true, ARRAY['hightech'],
 '{"sensors":"4x external","power":"Solar + USB","display":"Colour LCD","alarms":"Pressure, temp, leak"}'::jsonb),

('12V Jump Starter Power Bank 20000mAh',
 'jump-starter-20000mah',
 'Start a dead battery in seconds — petrol and diesel engines up to 6.0L. Doubles as a 20000mAh power bank with QC3.0 USB ports and a bright LED torch with SOS strobe.',
 'Starts dead batteries + charges your devices',
 65.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 9, true, true, ARRAY['premium','hightech'],
 '{"capacity":"20000mAh","peak":"1200A","engines":"Up to 6.0L petrol/diesel","extras":"QC3.0, LED torch, SOS"}'::jsonb),

('Cordless Car Vacuum Cleaner 120W',
 'cordless-car-vacuum',
 'Powerful 120W cordless vacuum for car interiors. Crevice tool and brush attachments reach under seats and between cushions. Washable HEPA filter, 25-min runtime.',
 'Deep-clean your interior anywhere',
 25.00,
 (SELECT id FROM public.categories WHERE slug = 'car-electronics'),
 15, false, true, ARRAY['accessories'],
 '{"power":"120W / 8000Pa","runtime":"25 min","filter":"Washable HEPA","charge":"USB-C"}'::jsonb),

-- ── GADGETS ──────────────────────────────────────────────────
('20000mAh Power Bank 22.5W Fast Charge',
 'power-bank-20000-22w',
 'High-capacity 20000mAh power bank with 22.5W fast charging. Dual USB + USB-C outputs, LED digital display, airline-safe. Charge your phone 4+ times on the road.',
 '4+ phone charges, LED display, fast charge',
 28.00,
 (SELECT id FROM public.categories WHERE slug = 'gadgets'),
 25, true, true, ARRAY['bestseller'],
 '{"capacity":"20000mAh","output":"22.5W max","ports":"2x USB-A + USB-C","display":"LED %"}'::jsonb),

('100W USB-C Charging Cable 1m',
 '100w-usb-c-cable-1m',
 'Premium 100W USB-C to USB-C fast-charging cable. Nylon-braided, supports PD 3.0, compatible with laptops, tablets and phones. Rated for 10,000+ bends.',
 'Nylon-braided 100W PD fast-charging cable',
 4.00,
 (SELECT id FROM public.categories WHERE slug = 'gadgets'),
 60, false, true, ARRAY['bestseller','accessories'],
 '{"length":"1m","wattage":"100W","standard":"PD 3.0","material":"Nylon braid"}'::jsonb),

('65W GaN Fast Charger (USB-C + USB-A)',
 '65w-gan-charger',
 'Compact GaN II wall charger — 65W USB-C PD plus USB-A QC3.0. Charges laptops, phones and tablets at full speed. Foldable pins, travel-friendly.',
 'One charger for laptop, phone & tablet',
 22.00,
 (SELECT id FROM public.categories WHERE slug = 'gadgets'),
 20, false, true, ARRAY['hightech'],
 '{"output":"65W USB-C PD + 18W USB-A","tech":"GaN II","input":"100-240V"}'::jsonb),

('MagSafe-Compatible Magnetic Power Bank 10000mAh',
 'magsafe-power-bank-10000',
 'Snap-on magnetic wireless power bank for iPhone 12+. 10000mAh, 15W wireless + 20W wired, LED display, kickstand. Charges through MagSafe cases.',
 'Magnetic snap-on wireless charging on the go',
 30.00,
 (SELECT id FROM public.categories WHERE slug = 'gadgets'),
 18, false, true, ARRAY['hightech'],
 '{"capacity":"10000mAh","wireless":"15W magnetic","wired":"20W USB-C","extras":"Kickstand"}'::jsonb),

('3-Axis Phone Gimbal Stabiliser',
 '3-axis-phone-gimbal',
 'Smooth cinematic video from your phone. 3-axis stabilisation, face tracking, gesture control, and a built-in extension rod. Folds flat for the glove box.',
 'Cinematic video from your phone',
 45.00,
 (SELECT id FROM public.categories WHERE slug = 'gadgets'),
 7, false, true, ARRAY['hightech'],
 '{"axes":"3-axis","tracking":"Face + object","battery":"8h","extras":"Extension rod, tripod"}'::jsonb),

-- ── CAR ACCESSORIES ──────────────────────────────────────────
('Magnetic Car Phone Mount — Air Vent',
 'magnetic-car-phone-mount',
 'Strong N52-magnet vent mount holds any phone steady on rough roads. 360° rotation, one-hand docking, silicone grip. Includes 2 metal plates.',
 'Rock-solid one-hand phone docking',
 8.00,
 (SELECT id FROM public.categories WHERE slug = 'car-accessories'),
 60, false, true, ARRAY['bestseller','accessories'],
 '{"magnet":"N52 x6","rotation":"360°","fit":"All phones, vent mount"}'::jsonb),

('Premium Leather Seat Covers — Full Set',
 'leather-seat-covers-full-set',
 'Full-set PU leather seat covers for most sedans and SUVs. Waterproof, scratch-resistant, airbag-compatible design with storage pockets. Front + rear.',
 'Full interior upgrade — waterproof PU leather',
 55.00,
 (SELECT id FROM public.categories WHERE slug = 'car-accessories'),
 8, true, true, ARRAY['premium'],
 '{"material":"PU leather","fit":"Universal sedan/SUV","pieces":"5-seat full set","features":"Airbag-compatible"}'::jsonb),

('All-Weather Rubber Floor Mats — 4pc',
 'all-weather-floor-mats-4pc',
 'Heavy-duty all-weather floor mats with deep channels that trap mud, water and dust. Trim-to-fit universal sizing, anti-slip backing. Front + rear set.',
 'Traps mud, water & dust — trim to fit',
 30.00,
 (SELECT id FROM public.categories WHERE slug = 'car-accessories'),
 15, false, true, ARRAY['accessories'],
 '{"pieces":"4 (front + rear)","material":"Heavy-duty rubber","fit":"Trim-to-fit universal"}'::jsonb),

('Car Boot Organiser — Foldable',
 'car-boot-organiser',
 'Collapsible boot organiser with 3 compartments, mesh pockets and non-slip base. Keeps groceries, tools and emergency gear in place. Folds flat when not needed.',
 'End boot clutter — groceries, tools, gear',
 15.00,
 (SELECT id FROM public.categories WHERE slug = 'car-accessories'),
 25, false, true, ARRAY['accessories'],
 '{"capacity":"3 compartments","material":"600D Oxford","base":"Non-slip, foldable"}'::jsonb),

('Digital Tyre Inflator — Portable 12V',
 'digital-tyre-inflator-12v',
 'Portable 12V tyre inflator with digital pressure gauge and auto shut-off. Inflates a flat in under 4 minutes. LED light, 3 nozzle adapters for bikes, balls and inflatables.',
 'Digital gauge + auto-stop — flat fixed in 4 min',
 28.00,
 (SELECT id FROM public.categories WHERE slug = 'car-accessories'),
 20, false, true, ARRAY['bestseller'],
 '{"power":"12V socket","pressure":"Up to 150 PSI","extras":"LED light, auto shut-off, 3 nozzles"}'::jsonb),

('Universal Sun Shade Windscreen — Foldable',
 'windscreen-sun-shade',
 'Reflective foldable windscreen shade that cuts interior heat by up to 30°C. Universal 140x70cm fit, pops open in a second, folds into a compact pouch.',
 'Cuts cabin heat — pops open in a second',
 7.00,
 (SELECT id FROM public.categories WHERE slug = 'car-accessories'),
 40, false, true, ARRAY['accessories'],
 '{"size":"140 x 70cm","material":"Reflective silver","storage":"Foldable pouch"}'::jsonb),

-- ── AUDIO ────────────────────────────────────────────────────
('Wireless Earbuds — Bluetooth 5.3 ANC',
 'wireless-earbuds-anc',
 'True wireless earbuds with active noise cancellation and 30-hour total playtime. Touch controls, IPX5 sweat resistance, USB-C fast case. Perfect for the commute.',
 'ANC, 30h playtime, USB-C fast charge',
 18.00,
 (SELECT id FROM public.categories WHERE slug = 'audio'),
 35, false, true, ARRAY['bestseller'],
 '{"bluetooth":"5.3","anc":"Yes","playtime":"30h total","rating":"IPX5"}'::jsonb),

('6.5" Car Speakers 300W — Pair',
 '6-5-car-speakers-300w',
 '6.5-inch coaxial car speakers, 300W peak per pair. Crisp highs and punchy mids — a direct upgrade for factory door speakers. Universal 4-ohm fit.',
 'Direct upgrade for factory door speakers',
 40.00,
 (SELECT id FROM public.categories WHERE slug = 'audio'),
 10, false, true, ARRAY['premium'],
 '{"size":"6.5 inch coaxial","power":"300W peak","impedance":"4 ohm","sold":"Pair"}'::jsonb),

('Bluetooth Aux Receiver — Hands-Free Kit',
 'bt-aux-receiver',
 'Turns any aux port into Bluetooth. Stream music and answer calls in older cars — 3.5mm plug, 10h battery, built-in mic, auto-reconnect.',
 'Add Bluetooth to any car stereo',
 10.00,
 (SELECT id FROM public.categories WHERE slug = 'audio'),
 45, false, true, ARRAY['bestseller','accessories'],
 '{"output":"3.5mm aux","battery":"10h","mic":"Built-in hands-free"}'::jsonb),

('Portable Bluetooth Speaker — IPX7',
 'portable-bt-speaker-ipx7',
 'Rugged IPX7 waterproof Bluetooth speaker with 24h playtime, TWS stereo pairing and a strap for the 4x4, braai or beach. Big bass in a small body.',
 'Waterproof, 24h play, pair two for stereo',
 25.00,
 (SELECT id FROM public.categories WHERE slug = 'audio'),
 15, false, true, ARRAY['hightech'],
 '{"rating":"IPX7","playtime":"24h","pairing":"TWS stereo","power":"20W"}'::jsonb),

-- ── VEHICLE CARE ─────────────────────────────────────────────
('Complete Car Wash Kit — 8 Pieces',
 'car-wash-kit-8pc',
 'Everything for a proper wash: 2 microfibre wash mitts, 3 detailing towels, wheel brush, wash sponge and a collapsible bucket. Safe on all paint.',
 'Full wash-day kit in one bag',
 20.00,
 (SELECT id FROM public.categories WHERE slug = 'vehicle-care'),
 20, false, true, ARRAY['accessories'],
 '{"pieces":"8","includes":"Mitts, towels, wheel brush, bucket"}'::jsonb),

('Microfibre Detailing Towels — 6 Pack',
 'microfibre-towels-6pack',
 'Ultra-soft 400gsm microfibre towels for drying, polishing and interior dusting. Lint-free, edgeless, machine washable. 40x40cm each.',
 'Lint-free drying & polishing, 6 pack',
 8.00,
 (SELECT id FROM public.categories WHERE slug = 'vehicle-care'),
 50, false, true, ARRAY['bestseller','accessories'],
 '{"pieces":"6","size":"40 x 40cm","weight":"400gsm","edge":"Edgeless"}'::jsonb),

('Carnauba Wax & Polish Kit',
 'carnauba-wax-polish-kit',
 'Carnauba paste wax plus applicator pads and a buffing towel. Deep gloss, water-beading protection that lasts 3 months. Safe on all colours.',
 'Deep gloss + 3-month protection',
 16.00,
 (SELECT id FROM public.categories WHERE slug = 'vehicle-care'),
 18, false, true, ARRAY['accessories'],
 '{"wax":"Carnauba paste","durability":"~3 months","includes":"Pads + towel"}'::jsonb),

('Headlight Restoration Kit',
 'headlight-restoration-kit',
 'Bring cloudy, yellowed headlights back to crystal clear in under an hour. Sanding discs, polish, UV sealant and applicator — fits any drill.',
 'Crystal-clear headlights in under an hour',
 14.00,
 (SELECT id FROM public.categories WHERE slug = 'vehicle-care'),
 15, false, true, ARRAY['accessories'],
 '{"includes":"Sanding discs, polish, UV sealant","tool":"Fits any drill"}'::jsonb),

('Emergency Roadside Tool Kit',
 'emergency-roadside-kit',
 'Be ready for anything: jumper cables, tow rope, warning triangle, high-vis vest, torch, gloves, tyre gauge and first-aid basics in a carry bag.',
 'Jumper cables, tow rope, triangle & more',
 35.00,
 (SELECT id FROM public.categories WHERE slug = 'vehicle-care'),
 12, false, true, ARRAY['premium'],
 '{"pieces":"10+","includes":"Jumper cables, tow rope, triangle, vest, torch"}'::jsonb),

('168-Piece Mechanics Tool Set',
 '168pc-mechanics-tool-set',
 'Complete 168-piece chrome-vanadium socket and spanner set in a blow-mould case. Metric + imperial, ratchets, extensions, bits — the full roadside workshop.',
 'The full roadside workshop in one case',
 55.00,
 (SELECT id FROM public.categories WHERE slug = 'vehicle-care'),
 6, true, true, ARRAY['premium','hightech'],
 '{"pieces":"168","material":"Chrome vanadium","case":"Blow-mould carry case"}'::jsonb),

-- ── SMART TECH ───────────────────────────────────────────────
('4G GPS Vehicle Tracker — Real-Time',
 'gps-tracker-4g',
 'Real-time 4G GPS tracker with geo-fencing, history playback and engine cut-off relay (optional install). Track from any phone — works nationwide.',
 'Track your vehicle live from your phone',
 30.00,
 (SELECT id FROM public.categories WHERE slug = 'smart-tech'),
 20, true, true, ARRAY['bestseller','hightech'],
 '{"network":"4G LTE","features":"Geo-fence, history, ACC detect","extras":"Optional engine cut-off"}'::jsonb),

('300W Car Power Inverter — 12V to 220V',
 '300w-car-power-inverter',
 'Pure sine 300W inverter — run a laptop, TV or tool charger from your 12V socket. Dual USB + AC outlet, silent fan, overload & low-battery protection.',
 'Mains power from your 12V socket',
 35.00,
 (SELECT id FROM public.categories WHERE slug = 'smart-tech'),
 12, false, true, ARRAY['hightech'],
 '{"output":"300W AC 220V","ports":"AC + 2x USB","protection":"Overload, low-battery, thermal"}'::jsonb),

('OBD Heads-Up Display (HUD) — Digital Speedo',
 'obd-hud-display',
 'Windscreen heads-up display reading live OBD data: speed, RPM, water temp, voltage and fault alarms. Auto-brightness, plug-and-play on most 2008+ vehicles.',
 'Live speed, RPM & temps on your windscreen',
 32.00,
 (SELECT id FROM public.categories WHERE slug = 'smart-tech'),
 10, false, true, ARRAY['hightech'],
 '{"data":"Speed, RPM, temp, voltage, alarms","input":"OBD2 plug","display":"Auto-dimming LED"}'::jsonb),

('Solar Battery Maintainer 12V',
 'solar-battery-maintainer',
 'Trickle-charge your 12V battery with sunlight — keeps parked cars, bikes and generators topped up. Weatherproof panel, plug-and-play clamps.',
 'Keeps parked batteries topped up, free power',
 22.00,
 (SELECT id FROM public.categories WHERE slug = 'smart-tech'),
 14, false, true, ARRAY['accessories'],
 '{"output":"12V trickle","panel":"Weatherproof","connect":"Battery clamps"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Product images (Unsplash — replace in admin as needed) ─
INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  '4k-dual-dash-cam','66w-dual-car-charger','bt-fm-transmitter-car-kit','obd-hud-display'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1546614042-7df3c24c9e5d?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'obd2-bluetooth-scanner','gps-tracker-4g'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  '7-carplay-android-auto-display','magnetic-car-phone-mount'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'power-bank-20000-22w','magsafe-power-bank-10000','jump-starter-20000mah','solar-battery-maintainer','300w-car-power-inverter'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  '65w-gan-charger','100w-usb-c-cable-1m','bt-aux-receiver'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'wireless-earbuds-anc','portable-bt-speaker-ipx7','6-5-car-speakers-300w'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'solar-tpms-tyre-pressure','digital-tyre-inflator-12v','windscreen-sun-shade'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'cordless-car-vacuum','car-wash-kit-8pc','microfibre-towels-6pack','carnauba-wax-polish-kit','headlight-restoration-kit'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'emergency-roadside-kit','168pc-mechanics-tool-set'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  '3-axis-phone-gimbal'
) ON CONFLICT DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&q=80&auto=format', p.name, true, 0
FROM public.products p WHERE p.slug IN (
  'leather-seat-covers-full-set','all-weather-floor-mats-4pc','car-boot-organiser'
) ON CONFLICT DO NOTHING;

-- Done. Run this once in the Supabase SQL editor.
-- Re-running is safe: ON CONFLICT DO NOTHING prevents duplicates.
