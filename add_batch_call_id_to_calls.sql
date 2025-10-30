-- Script para agregar batch_call_id y services_count a la tabla calls
-- Esto permitirá rastrear qué campaña generó cada llamada

-- 1. Verificar columnas existentes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calls'
  AND column_name IN ('batch_call_id', 'services_count')
ORDER BY ordinal_position;

-- 2. Agregar columna batch_call_id para relacionar con batch_calls
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'batch_call_id'
    ) THEN
        ALTER TABLE calls ADD COLUMN batch_call_id INTEGER REFERENCES batch_calls(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Columna batch_call_id agregada exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna batch_call_id ya existe.';
    END IF;
END $$;

-- 3. Agregar columna services_count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'services_count'
    ) THEN
        ALTER TABLE calls ADD COLUMN services_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Columna services_count agregada exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna services_count ya existe.';
    END IF;
END $$;

-- 4. Crear índice en batch_call_id para búsquedas rápidas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'calls' AND indexname = 'idx_calls_batch_call_id'
    ) THEN
        CREATE INDEX idx_calls_batch_call_id ON calls(batch_call_id);
        RAISE NOTICE '✅ Índice idx_calls_batch_call_id creado exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ El índice idx_calls_batch_call_id ya existe.';
    END IF;
END $$;

-- 5. Verificación final
SELECT 
    '✅ Verificación final' as status,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'calls' 
  AND column_name IN ('batch_call_id', 'services_count')
ORDER BY ordinal_position;

-- 6. Ver muestra de datos
SELECT 
    id, 
    phone_to, 
    status, 
    batch_call_id, 
    services_count,
    created_at
FROM calls
ORDER BY created_at DESC
LIMIT 5;

