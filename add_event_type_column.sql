-- Añadir columna event_type a la tabla special_events
ALTER TABLE public.special_events 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'general';

-- Comentario para documentación (opcional)
COMMENT ON COLUMN public.special_events.event_type IS 'Tipo de evento para efectos visuales (christmas, cyber, summer, sale, general)';
