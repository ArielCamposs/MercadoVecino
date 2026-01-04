-- Migración para añadir opciones de entrega a los productos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS allows_pickup BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS allows_delivery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;

COMMENT ON COLUMN products.allows_pickup IS 'Indica si el producto se puede retirar presencialmente';
COMMENT ON COLUMN products.allows_delivery IS 'Indica si el comerciante ofrece despacho a domicilio';
COMMENT ON COLUMN products.delivery_fee IS 'Costo del despacho (0 si es gratis o a convenir)';
