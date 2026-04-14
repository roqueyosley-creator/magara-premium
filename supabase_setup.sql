-- 1. Crear tabla de productos
CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  priceUSD numeric NOT NULL,
  description text,
  features text[], -- Un arreglo de textos para las viñetas
  images text[] NOT NULL, -- Arreglo de base64 o URL
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Políticas de Seguridad (RLS)
-- Como es un catálogo público, cualquiera puede leer la tabla:
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de productos"
ON public.products FOR SELECT
TO public
USING (true);

-- Nota de Seguridad: Para el bot de Telegram de forma rápida (sin Edge Functions), 
-- estamos invocándolo vía POST en JS usando el Telegram Bot API. 
-- Para mayor seguridad, el admin debería insertar los productos autenticándose en supabase.
-- Por practicidad (permitir que el admin.html inserte directamente sin auth de usuario), 
-- temporalmente habilitaremos inserción/eliminación pública (CUIDADO en producción real):
CREATE POLICY "Insercion publica"
ON public.products FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Borrado publico"
ON public.products FOR DELETE
TO public
USING (true);
