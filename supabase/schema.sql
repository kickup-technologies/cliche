-- =============================================
-- SCHEMA COMPLETO - CLICHÉ AROMAS
-- Ejecutar en: Supabase → SQL Editor
-- =============================================

-- Suscriptores (emails capturados)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'newsletter',   -- 'newsletter' | 'popup' | 'exit-intent'
  discount_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Productos con inventario real
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL,             -- en COP (ej: 85000)
  original_price INTEGER,
  description TEXT,
  image_url TEXT,
  badge TEXT,
  badge_color TEXT,
  stock INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promociones y timers de urgencia
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  end_time TIMESTAMPTZ,               -- NULL = sin expiración
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items del carrito por sesión
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, product_id)
);

-- Órdenes
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  customer_email TEXT,
  customer_name TEXT,
  total INTEGER,
  status TEXT DEFAULT 'pending',       -- pending | paid | shipped | cancelled
  items JSONB,
  discount_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DATOS DE EJEMPLO (reemplazar con los reales)
-- =============================================

INSERT INTO products (name, slug, price, original_price, image_url, badge, badge_color, stock, rating, reviews) VALUES
  ('Difusor Nebulizador Bambu',  'difusor-nebulizador-bambu',  85000,  100000, '/images/product-1.jpg', 'Mas vendido', 'bg-primary',   12, 4.8, 34),
  ('Esencia Lavanda Premium',    'esencia-lavanda-premium',    45000,  NULL,   '/images/product-2.jpg', 'Nuevo',       'bg-green-500',  3, 4.9, 56),
  ('Vela Aromatica Eucalipto',   'vela-aromatica-eucalipto',   65000,  75000,  '/images/product-3.jpg', NULL,          NULL,            8, 4.7, 28),
  ('Kit Relajacion Completo',    'kit-relajacion-completo',   185000, 220000,  '/images/product-4.jpg', 'Mas vendido', 'bg-primary',    4, 5.0, 42)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO promotions (code, discount_percent, end_time, description) VALUES
  ('QUEDATЕ15', 15, NOW() + INTERVAL '24 hours', 'Popup exit intent - 15% OFF'),
  ('PRIMERA20', 20, NOW() + INTERVAL '30 days',  'Primera compra - 20% OFF')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE subscribers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;

-- Productos visibles para todos (lectura pública)
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = TRUE);

-- Promociones visibles para todos
CREATE POLICY "promotions_public_read" ON promotions FOR SELECT USING (is_active = TRUE);

-- Cart: cada sesión ve solo sus items
CREATE POLICY "cart_session_access" ON cart_items
  FOR ALL USING (session_id = current_setting('app.session_id', TRUE));

-- Solo service_role puede escribir en subscribers y orders
CREATE POLICY "subscribers_service_only" ON subscribers
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "subscribers_service_read" ON subscribers
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "orders_service_only" ON orders
  FOR ALL USING (auth.role() = 'service_role');
