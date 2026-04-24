-- Sample data for development and testing
-- Represents a typical Nairobi duka (retail shop)

INSERT INTO users (id, email, name, phone, role, password_hash, created_at, updated_at) VALUES
  ('user-001', 'wanjiku@example.co.ke', 'Jane Wanjiku', '0712345678', 'owner',
   '$2b$12$LxXAbCVlqJ3eNFe.SJ0i1e4.YKi3xL7R4F7Kz8wR5L4Nt6MeqZpm2', -- password: demo123
   1713744000000, 1713744000000);

INSERT INTO businesses (id, name, owner_id, phone, location, business_type, currency, created_at, updated_at) VALUES
  ('biz-001', 'Wanjiku Enterprises', 'user-001', '0712345678', 'Westlands, Nairobi', 'retail', 'KES', 1713744000000, 1713744000000);

INSERT INTO products (id, business_id, name, sku, price, cost_price, stock_quantity, low_stock_threshold, unit, category, created_at, updated_at) VALUES
  ('prod-001', 'biz-001', 'Coca Cola 500ml',      'CCL-500',  60,  40, 120, 20, 'bottle', 'Drinks',    1713744000000, 1713744000000),
  ('prod-002', 'biz-001', 'Tusker Lager 500ml',   'TSK-500',  90,  65,  80, 12, 'bottle', 'Drinks',    1713744000000, 1713744000000),
  ('prod-003', 'biz-001', 'Unga Jogoo 2kg',        'UJG-2KG', 180, 145,  45, 10, 'packet', 'Groceries', 1713744000000, 1713744000000),
  ('prod-004', 'biz-001', 'Royco Mchuzi Mix 75g',  'RMM-75',   35,  25,  60,  8, 'piece',  'Spices',    1713744000000, 1713744000000),
  ('prod-005', 'biz-001', 'Blue Band 250g',        'BBD-250',  85,  65,  30,  5, 'tin',    'Groceries', 1713744000000, 1713744000000),
  ('prod-006', 'biz-001', 'Sukari Mumias 1kg',     'SKR-1KG', 135, 110,   8,  5, 'packet', 'Groceries', 1713744000000, 1713744000000),
  ('prod-007', 'biz-001', 'Sportsman 10s',         'SPT-10',  140, 110,  40,  5, 'pack',   'Tobacco',   1713744000000, 1713744000000),
  ('prod-008', 'biz-001', 'Lux Soap 175g',         'LUX-175',  65,  48,  50, 10, 'bar',    'Personal',  1713744000000, 1713744000000),
  ('prod-009', 'biz-001', 'Omo 500g',              'OMO-500', 125,  95,  25,  5, 'packet', 'Cleaning',  1713744000000, 1713744000000),
  ('prod-010', 'biz-001', 'Kabambe Phone',         'KBM-001', 1500, 1200,  3,  1, 'piece', 'Electronics', 1713744000000, 1713744000000);
