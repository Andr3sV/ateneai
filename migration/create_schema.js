const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabase = createClient(
  'https://kvjxmcjlrvddbbbfajci.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anhtY2pscnZkZGJiYmZhamNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA1MjQyOSwiZXhwIjoyMDY3NjI4NDI5fQ.-i7aLa4ij21mzpIRKa7yg-fEdoBjNO5seXLtasi9qDE'
);

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ ${description} completed`);
    return true;
  } catch (err) {
    console.error(`💥 Failed: ${err.message}`);
    return false;
  }
}

async function createNewSchema() {
  console.log('🏗️  Creating new workspace-based schema...\n');
  
  // Leer el archivo SQL
  const schemaPath = path.join(__dirname, 'new_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Dividir en statements individuales (simple split por ; y filter vacíos)
  const statements = schemaSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  console.log(`📝 Executing ${statements.length} SQL statements...\n`);
  
  let successCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.trim() === '') {
      continue;
    }
    
    const description = `Statement ${i + 1}/${statements.length}`;
    
    try {
      // Para Supabase, necesitamos ejecutar directamente via SQL
      const { error } = await supabase
        .from('_temp_exec')
        .select('*')
        .limit(0); // Dummy query para verificar conexión
      
      // Ejecutar el statement usando el método correcto
      const { data, error: execError } = await supabase.rpc('exec_sql', { 
        sql: statement + ';' 
      });
      
      if (execError) {
        console.error(`❌ ${description}: ${execError.message}`);
        console.log(`SQL: ${statement.substring(0, 100)}...`);
      } else {
        console.log(`✅ ${description}`);
        successCount++;
      }
    } catch (err) {
      console.error(`💥 ${description}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Schema Creation Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${statements.length - successCount}`);
  
  if (successCount === statements.length) {
    console.log('\n🎉 NEW SCHEMA CREATED SUCCESSFULLY!');
    return true;
  } else {
    console.log('\n⚠️  Some statements failed. Check Supabase manually.');
    return false;
  }
}

// Función alternativa para crear manualmente las tablas principales
async function createTablesManually() {
  console.log('🔧 Creating tables manually via API...\n');
  
  const tables = [
    {
      name: 'workspaces',
      sql: `CREATE TABLE IF NOT EXISTS workspaces (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        settings JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT true
      )`
    },
    {
      name: 'users_new',
      sql: `CREATE TABLE IF NOT EXISTS users_new (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      )`
    },
    {
      name: 'workspace_users',
      sql: `CREATE TABLE IF NOT EXISTS workspace_users (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT,
        user_id BIGINT,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        invited_by BIGINT,
        is_active BOOLEAN DEFAULT true
      )`
    },
    {
      name: 'contacts_new',
      sql: `CREATE TABLE IF NOT EXISTS contacts_new (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL,
        phone VARCHAR(50),
        name VARCHAR(255),
        email VARCHAR(255),
        instagram_url TEXT,
        country VARCHAR(10),
        status VARCHAR(50) DEFAULT 'Lead',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      )`
    },
    {
      name: 'conversations_new',
      sql: `CREATE TABLE IF NOT EXISTS conversations_new (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL,
        contact_id BIGINT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        assigned_to VARCHAR(100) DEFAULT 'agent_1',
        assigned_user_id BIGINT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      )`
    },
    {
      name: 'messages_new',
      sql: `CREATE TABLE IF NOT EXISTS messages_new (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL,
        conversation_id BIGINT NOT NULL,
        content JSONB NOT NULL,
        role VARCHAR(50) NOT NULL,
        sender_type VARCHAR(50) DEFAULT 'ai',
        sent_by BIGINT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      )`
    }
  ];
  
  let successCount = 0;
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      
      if (error) {
        console.error(`❌ Error creating ${table.name}:`, error.message);
      } else {
        console.log(`✅ Created table: ${table.name}`);
        successCount++;
      }
    } catch (err) {
      console.error(`💥 Failed to create ${table.name}:`, err.message);
    }
  }
  
  console.log(`\n📊 Tables Created: ${successCount}/${tables.length}`);
  return successCount === tables.length;
}

async function main() {
  console.log('🚀 Starting schema creation...\n');
  
  // Intentar crear schema completo primero
  let success = await createNewSchema();
  
  // Si falla, crear tablas manualmente
  if (!success) {
    console.log('\n🔄 Fallback: Creating tables manually...');
    success = await createTablesManually();
  }
  
  if (success) {
    console.log('\n✅ Schema creation completed! Ready for data migration.');
  } else {
    console.log('\n❌ Schema creation failed. Please check Supabase dashboard.');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createNewSchema, createTablesManually };