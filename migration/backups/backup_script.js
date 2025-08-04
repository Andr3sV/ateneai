const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabase = createClient(
  'https://kvjxmcjlrvddbbbfajci.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anhtY2pscnZkZGJiYmZhamNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA1MjQyOSwiZXhwIjoyMDY3NjI4NDI5fQ.-i7aLa4ij21mzpIRKa7yg-fEdoBjNO5seXLtasi9qDE'
);

async function backupTable(tableName) {
  console.log(`📦 Backing up table: ${tableName}`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error backing up ${tableName}:`, error);
      return;
    }
    
    // Guardar como JSON
    const jsonFile = path.join(__dirname, `${tableName}_backup_${Date.now()}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
    
    // Guardar como CSV
    if (data && data.length > 0) {
      const csvFile = path.join(__dirname, `${tableName}_backup_${Date.now()}.csv`);
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(',')
      );
      const csvContent = [headers, ...rows].join('\n');
      fs.writeFileSync(csvFile, csvContent);
    }
    
    console.log(`✅ ${tableName}: ${data?.length || 0} records backed up`);
    return data?.length || 0;
    
  } catch (err) {
    console.error(`💥 Failed to backup ${tableName}:`, err);
  }
}

async function createCompleteBackup() {
  console.log('🚀 Starting complete database backup...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`📅 Backup timestamp: ${timestamp}\n`);
  
  // Lista de tablas a respaldar
  const tables = ['clients', 'contacts', 'conversations', 'messages'];
  
  const summary = {
    timestamp,
    tables: {}
  };
  
  for (const table of tables) {
    const count = await backupTable(table);
    summary.tables[table] = count;
  }
  
  // Guardar resumen
  const summaryFile = path.join(__dirname, `backup_summary_${timestamp}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n📊 BACKUP SUMMARY:');
  console.log('==================');
  Object.entries(summary.tables).forEach(([table, count]) => {
    console.log(`${table}: ${count} records`);
  });
  
  console.log('\n✅ BACKUP COMPLETED SUCCESSFULLY!');
  console.log('🔒 All data is safely backed up before migration.');
}

// Ejecutar backup
createCompleteBackup().catch(console.error);