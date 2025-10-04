-- Script para agregar 'cancelled' al CHECK constraint de batch_calls

-- 1. Ver el constraint actual
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'batch_calls'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%status%';

-- 2. Eliminar el constraint antiguo
ALTER TABLE batch_calls DROP CONSTRAINT IF EXISTS batch_calls_status_check;

-- 3. Crear el nuevo constraint con 'cancelled' incluido
ALTER TABLE batch_calls ADD CONSTRAINT batch_calls_status_check
  CHECK (
    status IS NULL OR
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'in_progress')
  );

-- 4. Verificar el nuevo constraint
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'batch_calls'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%status%';

SELECT '✅ Constraint actualizado para permitir status "cancelled"' as mensaje;

