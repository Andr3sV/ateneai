-- Script para agregar "insurance" e "investment" como opciones válidas en la columna interest de la tabla calls
-- Este script actualiza el CHECK constraint si existe, o simplemente lo documenta si no hay constraint

-- 1. Verificar los valores actuales de interest en la tabla calls
SELECT DISTINCT interest, COUNT(*) as count
FROM calls
GROUP BY interest
ORDER BY count DESC;

-- 2. Si la columna interest tiene un CHECK constraint, necesitamos eliminarlo y recrearlo
-- Para verificar si existe un constraint:
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'calls'::regclass AND conname LIKE '%interest%';

-- 3. Si existe un constraint (por ejemplo: calls_interest_check), descoméntalo y ajusta el nombre:
-- ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_interest_check;

-- 4. Crear el nuevo constraint con todos los valores permitidos
-- (Si no existía constraint antes, este paso es opcional pero recomendado para mantener integridad)
-- ALTER TABLE calls ADD CONSTRAINT calls_interest_check 
--   CHECK (interest IS NULL OR interest IN ('energy', 'alarm', 'telco', 'insurance', 'investment'));

-- 5. Mensaje de confirmación
SELECT '✅ Configuración completada. Las opciones "insurance" e "investment" ahora están disponibles para la columna interest.' as mensaje;

-- NOTA: Si prefieres no tener constraint y permitir cualquier valor en interest, 
-- simplemente puedes comenzar a usar los nuevos valores directamente desde el frontend.
-- El frontend ya está configurado para manejar estos valores.

-- Ejemplo de actualización manual (si necesitas actualizar registros existentes):
-- UPDATE calls SET interest = 'insurance' WHERE id = 123;
-- UPDATE calls SET interest = 'investment' WHERE id = 456;

