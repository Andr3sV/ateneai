-- Script para agregar la columna postal_code a la tabla calls en Supabase

-- 1. Verificar si la columna ya existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calls' AND column_name = 'postal_code';

-- 2. Agregar la columna postal_code (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE calls ADD COLUMN postal_code TEXT;
        RAISE NOTICE '✅ Columna postal_code agregada exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna postal_code ya existe.';
    END IF;
END $$;

-- 3. Verificación final
SELECT 
    '✅ Verificación de columna postal_code' as status,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'calls' AND column_name = 'postal_code';

-- 4. Ver algunos registros de ejemplo (opcional)
-- SELECT id, phone_from, phone_to, city, postal_code, created_at
-- FROM calls
-- ORDER BY created_at DESC
-- LIMIT 5;

-- 5. Ejemplo de actualización manual (opcional - descomenta si necesitas actualizar algún registro)
-- UPDATE calls SET postal_code = '28001' WHERE id = 123;

