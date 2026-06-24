-- ============================================================
-- EATERY DEMO DATA CLEANUP: Istanbul / Beyoğlu Listings
-- ============================================================
--
-- PURPOSE
--   Replace placeholder names and irrelevant images on demo
--   listings located in Istanbul / Beyoğlu with realistic
--   food-focused titles, descriptions, tags, and photos.
--
-- SCHEMA ASSUMPTIONS (from migrations/0001_init.sql)
--   Table: public.listings
--   Image field : photos text[]          ← array of URLs
--   Name field  : title text
--   Location    : location_display text  (+ exact_address text)
--   Type field  : listing_type ('table' | 'market')
--   Tag fields  : cuisine_tags text[], dietary_tags text[]
--                 product_type_tags text[]  ← market only
--
-- Fields intentionally NOT touched:
--   id, host_id, created_at, listing_type, status,
--   location_lat, location_lng, location_display, exact_address,
--   price_per_unit, seats_*, quantity_*, meal_time,
--   pickup_window_*, allows_local_delivery, orders, reviews
--
-- HOW TO USE
--   1. Run the STEP 1 SELECT to preview affected rows.
--   2. Run the BEGIN … COMMIT block to apply changes.
--   3. Run STEP 3 SELECT to verify results.
--   4. To undo: re-run inside BEGIN … ROLLBACK (or restore from backup).
--
-- IMAGE URLS
--   All photos use Unsplash (images.unsplash.com).
--   They are stable CDN links (no API key required for public embeds).
--   Replace any URL with your own CDN path if needed.
-- ============================================================


-- ============================================================
-- STEP 1 — PREVIEW: inspect rows before any changes
-- ============================================================

SELECT
  id,
  listing_type,
  title,
  LEFT(description, 80)   AS description_preview,
  photos[1]               AS first_photo,
  location_display,
  exact_address,
  cuisine_tags,
  dietary_tags,
  status,
  created_at
FROM public.listings
WHERE
  location_display ILIKE '%istanbul%'
  OR location_display ILIKE '%beyoğlu%'
  OR location_display ILIKE '%cihangir%'
  OR location_display ILIKE '%galata%'
  OR location_display ILIKE '%karaköy%'
  OR location_display ILIKE '%tophane%'
  OR location_display ILIKE '%şişhane%'
  OR location_display ILIKE '%taksim%'
  OR location_display ILIKE '%moda%'
  OR location_display ILIKE '%kadıköy%'
  OR exact_address   ILIKE '%istanbul%'
  OR exact_address   ILIKE '%beyoğlu%'
  OR exact_address   ILIKE '%cihangir%'
  OR exact_address   ILIKE '%galata%'
  OR exact_address   ILIKE '%karaköy%'
  OR exact_address   ILIKE '%tophane%'
  OR exact_address   ILIKE '%şişhane%'
  OR exact_address   ILIKE '%taksim%'
  OR exact_address   ILIKE '%moda%'
  OR exact_address   ILIKE '%kadıköy%'
ORDER BY listing_type, created_at;


-- ============================================================
-- STEP 2 — UPDATE: wrapped in a transaction
--
-- To test without persisting: swap COMMIT for ROLLBACK at the
-- bottom of this block.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------------
-- Helper CTE pattern used in both updates:
--   • Filter Istanbul / Beyoğlu listings by type.
--   • Assign a sequential row number (rn) ordered by created_at so
--     older rows get lower numbers — this keeps assignment stable
--     across re-runs as long as no new rows are inserted.
--   • rn % 8 cycles through 8 distinct name/image slots (values 1-7
--     plus 0), so up to 8 listings of each type get a unique name.
--     If there are more than 8, they cycle predictably.
-- ------------------------------------------------------------------


-- ================================================================
-- 2a. TABLE LISTINGS
--     meal / dinner-table style names and images
-- ================================================================

WITH istanbul_tables AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.listings
  WHERE
    listing_type = 'table'
    AND (
      location_display ILIKE '%istanbul%'
      OR location_display ILIKE '%beyoğlu%'
      OR location_display ILIKE '%cihangir%'
      OR location_display ILIKE '%galata%'
      OR location_display ILIKE '%karaköy%'
      OR location_display ILIKE '%tophane%'
      OR location_display ILIKE '%şişhane%'
      OR location_display ILIKE '%taksim%'
      OR location_display ILIKE '%moda%'
      OR location_display ILIKE '%kadıköy%'
      OR exact_address   ILIKE '%istanbul%'
      OR exact_address   ILIKE '%beyoğlu%'
      OR exact_address   ILIKE '%cihangir%'
      OR exact_address   ILIKE '%galata%'
      OR exact_address   ILIKE '%karaköy%'
      OR exact_address   ILIKE '%tophane%'
      OR exact_address   ILIKE '%şişhane%'
      OR exact_address   ILIKE '%taksim%'
      OR exact_address   ILIKE '%moda%'
      OR exact_address   ILIKE '%kadıköy%'
    )
)
UPDATE public.listings AS l
SET
  -- ── title ────────────────────────────────────────────────────
  title = CASE (it.rn % 8)
    WHEN 1 THEN 'Turkish Chicken Dinner'
    WHEN 2 THEN 'Homemade Köfte Table'
    WHEN 3 THEN 'Döner Night'
    WHEN 4 THEN 'Falafel & Mezze Table'
    WHEN 5 THEN 'Sunday Turkish Breakfast'
    WHEN 6 THEN 'Aegean Vegan Dinner'
    WHEN 7 THEN 'Homemade Mantı Night'
    WHEN 0 THEN 'Istanbul Meze Table'
  END,

  -- ── description ──────────────────────────────────────────────
  description = CASE (it.rn % 8)
    WHEN 1 THEN
      'Slow-roasted chicken with saffron rice, caramelised peppers, and a side of cacık. '
      'A comforting Turkish home-cooked dinner hosted in Beyoğlu — seats are limited, '
      'so expect an intimate evening around a shared table.'
    WHEN 2 THEN
      'Hand-rolled köfte served with herbed bulgur pilaf, shepherd''s salad, and '
      'homemade ezme. A classic Anatolian dinner in the heart of Istanbul. '
      'Vegetable sides change with the season.'
    WHEN 3 THEN
      'Freshly sliced döner with warm flatbread, sumac-marinated onions, and roasted '
      'tomatoes. Street-food spirit served family style — bring your appetite. '
      'Halal meat, sourced locally.'
    WHEN 4 THEN
      'A generous sharing table of crispy falafel, hummus, baba ghanoush, warm pitta, '
      'and seasonal mezze. Entirely vegetarian and easily vegan. Great for groups.'
    WHEN 5 THEN
      'The full Turkish kahvaltı experience: simit, white cheese, black olives, '
      'sliced tomatoes, cucumbers, soft-boiled eggs, honey, kaymak, and endless '
      'çay. Slow mornings in Cihangir, exactly as they should be.'
    WHEN 6 THEN
      'An Aegean-inspired plant-based dinner — oven-baked courgettes, olive-oil '
      'braised white beans, stuffed peppers with pine nuts and rice, and a '
      'simple green salad. Light, colourful, and wholesome.'
    WHEN 7 THEN
      'Tiny hand-pinched mantı filled with spiced lamb, served with garlicky yogurt, '
      'brown butter, and dried mint. A labour-of-love dish made fresh on the day — '
      'served family style in Galata.'
    WHEN 0 THEN
      'A relaxed evening of hot and cold mezze: sigara böreği, haydari, acılı ezme, '
      'pilaki, and freshly baked bread. Perfect for sharing with new people in Istanbul.'
  END,

  -- ── cuisine_tags ─────────────────────────────────────────────
  cuisine_tags = CASE (it.rn % 8)
    WHEN 1 THEN ARRAY['Turkish', 'Anatolian', 'Home Cooking']
    WHEN 2 THEN ARRAY['Turkish', 'Anatolian', 'Grilled']
    WHEN 3 THEN ARRAY['Turkish', 'Street Food', 'Grilled']
    WHEN 4 THEN ARRAY['Middle Eastern', 'Vegetarian', 'Mezze']
    WHEN 5 THEN ARRAY['Turkish', 'Breakfast', 'Brunch']
    WHEN 6 THEN ARRAY['Aegean', 'Mediterranean', 'Vegan']
    WHEN 7 THEN ARRAY['Turkish', 'Anatolian', 'Home Cooking']
    WHEN 0 THEN ARRAY['Turkish', 'Mezze', 'Sharing']
  END,

  -- ── dietary_tags ─────────────────────────────────────────────
  dietary_tags = CASE (it.rn % 8)
    WHEN 1 THEN ARRAY['Halal', 'Gluten-Free Option']
    WHEN 2 THEN ARRAY['Halal', 'High Protein']
    WHEN 3 THEN ARRAY['Halal']
    WHEN 4 THEN ARRAY['Vegetarian', 'Vegan Option', 'Dairy-Free Option']
    WHEN 5 THEN ARRAY['Vegetarian']
    WHEN 6 THEN ARRAY['Vegan', 'Plant-Based', 'Gluten-Free']
    WHEN 7 THEN ARRAY['Halal']
    WHEN 0 THEN ARRAY['Vegetarian Option', 'Halal']
  END,

  -- ── photos ───────────────────────────────────────────────────
  -- Two URLs per slot: primary + a second angle / detail shot.
  -- All Unsplash — swap for your own CDN paths if preferred.
  photos = CASE (it.rn % 8)
    WHEN 1 THEN ARRAY[
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&q=80',  -- roasted chicken on a plate
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80'   -- colourful dinner spread
    ]
    WHEN 2 THEN ARRAY[
      'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=900&q=80',  -- köfte / grilled meatballs
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=80'       -- grilled meat table
    ]
    WHEN 3 THEN ARRAY[
      'https://images.unsplash.com/photo-1529042355636-0fc63a674f02?w=900&q=80',  -- döner / kebab wrap
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900&q=80'   -- grilled meats
    ]
    WHEN 4 THEN ARRAY[
      'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=900&q=80',  -- falafel platter
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80'       -- mezze / hummus spread
    ]
    WHEN 5 THEN ARRAY[
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80',  -- Turkish breakfast spread
      'https://images.unsplash.com/photo-1530089711124-9ca31fb9e863?w=900&q=80'   -- breakfast table with tea
    ]
    WHEN 6 THEN ARRAY[
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80',  -- colourful vegan bowl
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80'   -- roasted vegetables
    ]
    WHEN 7 THEN ARRAY[
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=900&q=80',  -- dumplings / mantı close-up
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=80'       -- pasta / dumplings in bowl
    ]
    WHEN 0 THEN ARRAY[
      'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=900&q=80',  -- mezze sharing table
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80'   -- colourful food spread
    ]
  END

FROM istanbul_tables AS it
WHERE l.id = it.id;


-- ================================================================
-- 2b. MARKET LISTINGS
--     packaged / product style names and images
-- ================================================================

WITH istanbul_market AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.listings
  WHERE
    listing_type = 'market'
    AND (
      location_display ILIKE '%istanbul%'
      OR location_display ILIKE '%beyoğlu%'
      OR location_display ILIKE '%cihangir%'
      OR location_display ILIKE '%galata%'
      OR location_display ILIKE '%karaköy%'
      OR location_display ILIKE '%tophane%'
      OR location_display ILIKE '%şişhane%'
      OR location_display ILIKE '%taksim%'
      OR location_display ILIKE '%moda%'
      OR location_display ILIKE '%kadıköy%'
      OR exact_address   ILIKE '%istanbul%'
      OR exact_address   ILIKE '%beyoğlu%'
      OR exact_address   ILIKE '%cihangir%'
      OR exact_address   ILIKE '%galata%'
      OR exact_address   ILIKE '%karaköy%'
      OR exact_address   ILIKE '%tophane%'
      OR exact_address   ILIKE '%şişhane%'
      OR exact_address   ILIKE '%taksim%'
      OR exact_address   ILIKE '%moda%'
      OR exact_address   ILIKE '%kadıköy%'
    )
)
UPDATE public.listings AS l
SET
  -- ── title ────────────────────────────────────────────────────
  title = CASE (im.rn % 8)
    WHEN 1 THEN 'Fresh Baklava Box'
    WHEN 2 THEN 'Homemade Dolma (10 pcs)'
    WHEN 3 THEN 'Jarred Tomato Sauce'
    WHEN 4 THEN 'Weekly Jam Jar'
    WHEN 5 THEN 'Homemade Pickles Jar'
    WHEN 6 THEN 'Frozen Mantı Pack'
    WHEN 7 THEN 'Sourdough Bread Loaf'
    WHEN 0 THEN 'Olive Oil Cookies'
  END,

  -- ── description ──────────────────────────────────────────────
  description = CASE (im.rn % 8)
    WHEN 1 THEN
      'Freshly made baklava with finely ground pistachios and light honey syrup, '
      'packaged in a gift-ready box. Made in small batches in Beyoğlu — order by '
      'Wednesday for weekend pickup.'
    WHEN 2 THEN
      'Vine-leaf dolma stuffed with herbed rice, lemon zest, and olive oil. Served '
      'cold as a classic meze or a light snack. Each order is 10 pieces, made fresh '
      'on the day of pickup.'
    WHEN 3 THEN
      'Slow-cooked tomato sauce made with Aegean tomatoes, extra-virgin olive oil, '
      'garlic, and fresh basil. No preservatives. One 350 ml jar covers two generous '
      'pasta portions.'
    WHEN 4 THEN
      'Small-batch seasonal jam — strawberry, fig, or sour cherry depending on '
      'availability. Low sugar, no pectin or preservatives. 300 g jar. '
      'Check the listing description each week for the current flavour.'
    WHEN 5 THEN
      'Traditional lacto-fermented pickles — cucumbers, peppers, and turnips in '
      'brine. Crunchy, tangy, and naturally preserved with no vinegar. 500 ml jar.'
    WHEN 6 THEN
      'Handmade mantı filled with spiced ground lamb and onion, frozen fresh '
      'for easy cooking at home. 400 g pack (approx. 50 pieces). '
      'Cook from frozen in boiling water — ready in 10 minutes.'
    WHEN 7 THEN
      'Naturally leavened sourdough baked fresh in Cihangir. Crisp dark crust, '
      'open crumb, mild tang. Whole loaves only. Available Thursday to Saturday — '
      'order one day in advance.'
    WHEN 0 THEN
      'Buttery shortbread cookies made with Turkish olive oil and orange zest. '
      'A classic Aegean pastry treat from Istanbul. 200 g bag (approx. 12 cookies). '
      'Best enjoyed with a cup of çay.'
  END,

  -- ── cuisine_tags ─────────────────────────────────────────────
  cuisine_tags = CASE (im.rn % 8)
    WHEN 1 THEN ARRAY['Turkish', 'Pastry', 'Dessert']
    WHEN 2 THEN ARRAY['Turkish', 'Mezze', 'Mediterranean']
    WHEN 3 THEN ARRAY['Mediterranean', 'Pantry', 'Aegean']
    WHEN 4 THEN ARRAY['Pantry', 'Preserves', 'Seasonal']
    WHEN 5 THEN ARRAY['Turkish', 'Fermented', 'Pantry']
    WHEN 6 THEN ARRAY['Turkish', 'Anatolian', 'Frozen']
    WHEN 7 THEN ARRAY['Artisan', 'Bakery', 'Sourdough']
    WHEN 0 THEN ARRAY['Turkish', 'Bakery', 'Aegean']
  END,

  -- ── dietary_tags ─────────────────────────────────────────────
  dietary_tags = CASE (im.rn % 8)
    WHEN 1 THEN ARRAY['Vegetarian', 'Contains Nuts']
    WHEN 2 THEN ARRAY['Vegan', 'Gluten-Free']
    WHEN 3 THEN ARRAY['Vegan', 'Gluten-Free']
    WHEN 4 THEN ARRAY['Vegan', 'Gluten-Free']
    WHEN 5 THEN ARRAY['Vegan', 'Gluten-Free']
    WHEN 6 THEN ARRAY['Halal', 'High Protein']
    WHEN 7 THEN ARRAY['Vegan']
    WHEN 0 THEN ARRAY['Vegetarian']
  END,

  -- ── product_type_tags ────────────────────────────────────────
  product_type_tags = CASE (im.rn % 8)
    WHEN 1 THEN ARRAY['Sweets & Pastry', 'Gift Box', 'Ready to Eat']
    WHEN 2 THEN ARRAY['Mezze', 'Ready to Eat', 'Fresh']
    WHEN 3 THEN ARRAY['Pantry', 'Sauce', 'Condiment']
    WHEN 4 THEN ARRAY['Pantry', 'Preserves', 'Jam']
    WHEN 5 THEN ARRAY['Pantry', 'Preserves', 'Fermented']
    WHEN 6 THEN ARRAY['Frozen', 'Ready to Cook', 'Dumplings']
    WHEN 7 THEN ARRAY['Bakery', 'Bread', 'Artisan']
    WHEN 0 THEN ARRAY['Bakery', 'Sweets & Pastry', 'Biscuits']
  END,

  -- ── photos ───────────────────────────────────────────────────
  photos = CASE (im.rn % 8)
    WHEN 1 THEN ARRAY[
      'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=900&q=80',  -- baklava tray
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=900&q=80'   -- pistachio sweets close-up
    ]
    WHEN 2 THEN ARRAY[
      'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=900&q=80',  -- stuffed grape leaves / dolma
      'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=900&q=80'   -- mezze platter
    ]
    WHEN 3 THEN ARRAY[
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',     -- rich tomato sauce in pan
      'https://images.unsplash.com/photo-1589254065909-b7086229d08c?w=900&q=80'   -- jarred tomato sauce
    ]
    WHEN 4 THEN ARRAY[
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=900&q=80',  -- jam jars assortment
      'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=900&q=80'   -- preserves / jars on shelf
    ]
    WHEN 5 THEN ARRAY[
      'https://images.unsplash.com/photo-1598131792697-7f1a1b39dbf8?w=900&q=80',  -- pickles in glass jars
      'https://images.unsplash.com/photo-1560963689-b5682b6440f8?w=900&q=80'       -- fermented vegetables
    ]
    WHEN 6 THEN ARRAY[
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=900&q=80',  -- dumplings close-up
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=80'       -- dumplings in bowl with sauce
    ]
    WHEN 7 THEN ARRAY[
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=900&q=80',     -- sourdough loaf
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80'   -- artisan bread sliced
    ]
    WHEN 0 THEN ARRAY[
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=900&q=80',  -- shortbread cookies
      'https://images.unsplash.com/photo-1618125971459-e1fe0dc69ec3?w=900&q=80'   -- olive oil cookies on cloth
    ]
  END

FROM istanbul_market AS im
WHERE l.id = im.id;


-- ================================================================
-- Commit (or rollback to test without persisting)
-- ================================================================
COMMIT;
-- To test without saving: replace the line above with:
-- ROLLBACK;


-- ============================================================
-- STEP 3 — VERIFY: confirm the updates look correct
-- ============================================================

SELECT
  id,
  listing_type,
  title,
  LEFT(description, 80)   AS description_preview,
  cuisine_tags,
  dietary_tags,
  photos[1]               AS primary_photo,
  array_length(photos, 1) AS photo_count,
  location_display,
  status
FROM public.listings
WHERE
  location_display ILIKE '%istanbul%'
  OR location_display ILIKE '%beyoğlu%'
  OR location_display ILIKE '%cihangir%'
  OR location_display ILIKE '%galata%'
  OR location_display ILIKE '%karaköy%'
  OR location_display ILIKE '%tophane%'
  OR location_display ILIKE '%şişhane%'
  OR location_display ILIKE '%taksim%'
  OR location_display ILIKE '%moda%'
  OR location_display ILIKE '%kadıköy%'
  OR exact_address   ILIKE '%istanbul%'
  OR exact_address   ILIKE '%beyoğlu%'
ORDER BY listing_type, title;
