-- Script para agregar columnas necesarias para la integración con call-manager
-- Este script agrega: external_batch_id, phone_provider, scheduled_time

-- 1. Verificar columnas existentes en batch_calls
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'batch_calls'
ORDER BY ordinal_position;

-- 2. Agregar columna external_batch_id para guardar el ID del call-manager
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batch_calls' AND column_name = 'external_batch_id'
    ) THEN
        ALTER TABLE batch_calls ADD COLUMN external_batch_id TEXT;
        RAISE NOTICE '✅ Columna external_batch_id agregada exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna external_batch_id ya existe.';
    END IF;
END $$;

-- 3. Agregar columna phone_provider para especificar twilio o sip_trunk
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batch_calls' AND column_name = 'phone_provider'
    ) THEN
        ALTER TABLE batch_calls ADD COLUMN phone_provider TEXT;
        RAISE NOTICE '✅ Columna phone_provider agregada exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna phone_provider ya existe.';
    END IF;
END $$;

-- 4. Agregar columna scheduled_time para programar llamadas (Unix timestamp)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batch_calls' AND column_name = 'scheduled_time'
    ) THEN
        ALTER TABLE batch_calls ADD COLUMN scheduled_time BIGINT;
        RAISE NOTICE '✅ Columna scheduled_time agregada exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna scheduled_time ya existe.';
    END IF;
END $$;

-- 5. Agregar índice en external_batch_id para búsquedas rápidas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'batch_calls' AND indexname = 'idx_batch_calls_external_batch_id'
    ) THEN
        CREATE INDEX idx_batch_calls_external_batch_id ON batch_calls(external_batch_id);
        RAISE NOTICE '✅ Índice idx_batch_calls_external_batch_id creado exitosamente.';
    ELSE
        RAISE NOTICE 'ℹ️ El índice idx_batch_calls_external_batch_id ya existe.';
    END IF;
END $$;

-- 6. Verificación final - mostrar todas las columnas
SELECT 
    '✅ Verificación final de columnas en batch_calls' as status,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'batch_calls'
ORDER BY ordinal_position;

-- 7. Verificar índices creados
SELECT 
    '✅ Índices en batch_calls' as status,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'batch_calls';

-- Ejemplo de uso:
-- UPDATE batch_calls 
-- SET 
--   external_batch_id = 'btcal_7601k6qjf6dgecgbc9hkq9gtw977',
--   phone_provider = 'sip_trunk',
--   scheduled_time = 1759580232
-- WHERE id = 1;

