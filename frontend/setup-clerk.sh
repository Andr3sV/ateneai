#!/bin/bash

echo "🔧 Configurando Clerk para el frontend..."

# Crear archivo .env.local
cat > .env.local << 'EOF'
# Clerk Keys - Reemplaza con tus claves reales de https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Supabase (ya configurado)
NEXT_PUBLIC_SUPABASE_URL=https://kvjxmcjlrvddbbbfajci.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anhtY2pscnZkZGJiYmZhamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNTI0MjksImV4cCI6MjA2NzYyODQyOX0.hmP-4n19TJrWIgz8FrarawyMhD1uHBj1A4VMQuP0F78

# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

echo "✅ Archivo .env.local creado!"
echo ""
echo "🚨 IMPORTANTE: Ahora necesitas:"
echo "1. Ir a https://dashboard.clerk.com"
echo "2. Crear una aplicación (si no la tienes)"
echo "3. Ir a 'API Keys'"
echo "4. Copiar tu Publishable Key y Secret Key"
echo "5. Reemplazar 'your_clerk_publishable_key_here' y 'your_clerk_secret_key_here' en .env.local"
echo ""
echo "Las claves se ven así:"
echo "- Publishable Key: pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
echo "- Secret Key: sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"