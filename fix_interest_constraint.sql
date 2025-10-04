-- Script para verificar y corregir el constraint de la columna interest en la tabla calls
-- Este script permite agregar 'insurance' e 'investment' como valores válidos

-- 1. Verificar si existe un constraint en la columna interest
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'calls'::regclass 
  AND contype = 'c'  -- CHECK constraint
  AND pg_get_constraintdef(oid) LIKE '%interest%';

-- 2. Si existe un constraint (por ejemplo: calls_interest_check), ejecuta esto:
-- IMPORTANTE: Reemplaza 'calls_interest_check' con el nombre real del constraint del paso 1

-- Eliminar el constraint antiguo
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_interest_check;

-- 3. Crear el nuevo constraint con todos los valores permitidos
ALTER TABLE calls ADD CONSTRAINT calls_interest_check 
  CHECK (
    interest IS NULL OR 
    interest IN ('energy', 'alarm', 'telco', 'insurance', 'investment')
  );

-- 4. Verificación final
SELECT 
    '✅ Constraint actualizado correctamente' as status,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'calls'::regclass 
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%interest%';

-- 5. Prueba rápida (opcional - descomenta si quieres probar)
-- UPDATE calls SET interest = 'insurance' WHERE id = (SELECT id FROM calls LIMIT 1);
-- SELECT id, interest FROM calls WHERE interest = 'insurance';

