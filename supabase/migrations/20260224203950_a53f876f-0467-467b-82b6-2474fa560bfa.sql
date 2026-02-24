
-- =====================================================
-- 1. NORMALIZE PRODUCT NAMES IN SALES TABLE
-- =====================================================
-- Consolidate duplicate products:
-- "Aéreo" → "Passagem Aérea"
-- "Hotel" → "Hospedagem"

UPDATE sales
SET products = array_replace(products, 'Aéreo', 'Passagem Aérea')
WHERE 'Aéreo' = ANY(products);

UPDATE sales
SET products = array_replace(products, 'Hotel', 'Hospedagem')
WHERE 'Hotel' = ANY(products);

-- =====================================================
-- 2. FIX SELLER ASSIGNMENTS USING tag_chatguru
-- =====================================================
-- Map tag_chatguru → seller: "Whats Particular Tiago" and "Orgânico" tags
-- Tiago already has profile: f84bab8c-df09-46b2-a676-fc7dc92bac13
UPDATE sales
SET seller_id = 'f84bab8c-df09-46b2-a676-fc7dc92bac13'
WHERE seller_id IS NULL
  AND (tag_chatguru ILIKE '%Tiago%');

-- Log the normalization
INSERT INTO audit_log (action, details)
VALUES (
  'product_normalization_and_seller_fix',
  'Consolidated Aéreo→Passagem Aérea, Hotel→Hospedagem. Assigned Tiago as seller for his tagged sales.'
);
