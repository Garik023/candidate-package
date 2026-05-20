-- Create tables
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(20) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  rating DECIMAL(3,1),
  country VARCHAR(10),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(20) REFERENCES categories(id),
  sku VARCHAR(50),
  price DECIMAL(12,2)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(20) PRIMARY KEY,
  supplier_id VARCHAR(20) REFERENCES suppliers(id),
  product_id VARCHAR(20) REFERENCES products(id),
  quantity INTEGER,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  status VARCHAR(20),
  priority VARCHAR(20),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  warehouse VARCHAR(50),
  notes TEXT,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'processing',
  total INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  action VARCHAR(20),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse ON orders(warehouse);
CREATE INDEX IF NOT EXISTS idx_orders_total_price ON orders(total_price);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
