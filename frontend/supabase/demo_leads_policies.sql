-- Opción 2: Crear políticas RLS para permitir inserción
-- Primero eliminar la política existente si existe
DROP POLICY IF EXISTS "Users can insert demo leads" ON demo_leads;

-- Crear política que permita a cualquiera insertar leads
CREATE POLICY "Allow public insert for demo leads" ON demo_leads
  FOR INSERT WITH CHECK (true);

-- Opcional: Política para que solo el propietario pueda ver sus leads
-- (Esto requiere autenticación)
-- CREATE POLICY "Users can view their own leads" ON demo_leads
--   FOR SELECT USING (auth.uid()::text = user_id);
