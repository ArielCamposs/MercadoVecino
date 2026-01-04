-- Migration to add status column for product moderation
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- Ensure existing products are marked as approved
UPDATE products SET status = 'approved' WHERE status IS NULL;

-- Create an index to improve performance on moderation queries
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
