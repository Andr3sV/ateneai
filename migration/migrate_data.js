const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabase = createClient(
  'https://kvjxmcjlrvddbbbfajci.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2anhtY2pscnZkZGJiYmZhamNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA1MjQyOSwiZXhwIjoyMDY3NjI4NDI5fQ.-i7aLa4ij21mzpIRKa7yg-fEdoBjNO5seXLtasi9qDE'
);

async function createDefaultWorkspace() {
  console.log('🏢 Creating default workspace...');
  
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert([{
      name: 'AteneAI Workspace',
      domain: 'ateneai.com',
      slug: 'ateneai',
      settings: {
        timezone: 'UTC',
        language: 'es',
        created_from_migration: true
      }
    }])
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating workspace:', error);
    throw error;
  }
  
  console.log('✅ Default workspace created:', workspace.id);
  return workspace.id;
}

async function migrateUsers(workspaceId) {
  console.log('👥 Migrating users...');
  
  // Obtener usuarios únicos de la tabla clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*');
  
  if (clientsError) {
    console.error('❌ Error fetching clients:', clientsError);
    throw clientsError;
  }
  
  const migratedUsers = [];
  
  for (const client of clients) {
    if (!client.clerk_user_id) continue;
    
    // Crear usuario en users_new
    const { data: user, error: userError } = await supabase
      .from('users_new')
      .insert([{
        email: client.email || 'unknown@ateneai.com',
        clerk_user_id: client.clerk_user_id,
        first_name: client.email?.split('@')[0] || 'User',
        last_name: ''
      }])
      .select()
      .single();
    
    if (userError) {
      console.error(`❌ Error creating user for client ${client.id}:`, userError);
      continue;
    }
    
    // Asignar usuario al workspace como owner
    const { error: workspaceUserError } = await supabase
      .from('workspace_users')
      .insert([{
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner'
      }]);
    
    if (workspaceUserError) {
      console.error(`❌ Error assigning user to workspace:`, workspaceUserError);
      continue;
    }
    
    migratedUsers.push({
      oldClientId: client.id,
      newUserId: user.id,
      clerkUserId: client.clerk_user_id
    });
    
    console.log(`✅ Migrated user: ${client.email} (Client ${client.id} → User ${user.id})`);
  }
  
  return migratedUsers;
}

async function migrateContacts(workspaceId) {
  console.log('📞 Migrating contacts...');
  
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching contacts:', error);
    throw error;
  }
  
  const contactMapping = {};
  let migratedCount = 0;
  
  for (const contact of contacts) {
    const { data: newContact, error: contactError } = await supabase
      .from('contacts_new')
      .insert([{
        workspace_id: workspaceId,
        phone: contact.phone,
        name: contact.name,
        email: contact.email,
        instagram_url: contact.instagram_url,
        country: contact.country,
        status: contact.status || 'Lead',
        created_at: contact.created_at,
        metadata: {
          migrated_from_id: contact.id,
          original_client_id: contact.client_id
        }
      }])
      .select()
      .single();
    
    if (contactError) {
      console.error(`❌ Error migrating contact ${contact.id}:`, contactError);
      continue;
    }
    
    contactMapping[contact.id] = newContact.id;
    migratedCount++;
  }
  
  console.log(`✅ Migrated ${migratedCount} contacts`);
  return contactMapping;
}

async function migrateConversations(workspaceId, contactMapping) {
  console.log('💬 Migrating conversations...');
  
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching conversations:', error);
    throw error;
  }
  
  const conversationMapping = {};
  let migratedCount = 0;
  
  for (const conversation of conversations) {
    const newContactId = contactMapping[conversation.contact_id];
    if (!newContactId) {
      console.warn(`⚠️  Skipping conversation ${conversation.id}: contact not found`);
      continue;
    }
    
    const { data: newConversation, error: convError } = await supabase
      .from('conversations_new')
      .insert([{
        workspace_id: workspaceId,
        contact_id: newContactId,
        status: conversation.status || 'open',
        assigned_to: conversation.assigned_to || 'agent_1',
        created_at: conversation.created_at,
        metadata: {
          migrated_from_id: conversation.id,
          original_client_id: conversation.client_id
        }
      }])
      .select()
      .single();
    
    if (convError) {
      console.error(`❌ Error migrating conversation ${conversation.id}:`, convError);
      continue;
    }
    
    conversationMapping[conversation.id] = newConversation.id;
    migratedCount++;
  }
  
  console.log(`✅ Migrated ${migratedCount} conversations`);
  return conversationMapping;
}

async function migrateMessages(workspaceId, conversationMapping) {
  console.log('💭 Migrating messages...');
  
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching messages:', error);
    throw error;
  }
  
  console.log(`📝 Processing ${messages.length} messages...`);
  
  let migratedCount = 0;
  const batchSize = 50; // Procesar en lotes para evitar timeouts
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const messagesToInsert = [];
    
    for (const message of batch) {
      const newConversationId = conversationMapping[message.conversation_id];
      if (!newConversationId) {
        console.warn(`⚠️  Skipping message ${message.id}: conversation not found`);
        continue;
      }
      
      messagesToInsert.push({
        workspace_id: workspaceId,
        conversation_id: newConversationId,
        content: message.content,
        role: message.role,
        sender_type: message.role === 'user' ? 'contact' : 'ai',
        created_at: message.created_at,
        metadata: {
          migrated_from_id: message.id
        }
      });
    }
    
    if (messagesToInsert.length > 0) {
      const { error: messagesError } = await supabase
        .from('messages_new')
        .insert(messagesToInsert);
      
      if (messagesError) {
        console.error(`❌ Error migrating message batch:`, messagesError);
        continue;
      }
      
      migratedCount += messagesToInsert.length;
    }
    
    console.log(`📝 Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)} (${migratedCount} messages migrated)`);
  }
  
  console.log(`✅ Migrated ${migratedCount} messages`);
  return migratedCount;
}

async function runMigration() {
  console.log('🚀 Starting data migration to workspace-based structure...\n');
  
  try {
    // 1. Crear workspace por defecto
    const workspaceId = await createDefaultWorkspace();
    
    // 2. Migrar usuarios
    const userMapping = await migrateUsers(workspaceId);
    
    // 3. Migrar contactos
    const contactMapping = await migrateContacts(workspaceId);
    
    // 4. Migrar conversaciones
    const conversationMapping = await migrateConversations(workspaceId, contactMapping);
    
    // 5. Migrar mensajes
    const messageCount = await migrateMessages(workspaceId, conversationMapping);
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`Workspace: ${workspaceId}`);
    console.log(`Users: ${userMapping.length}`);
    console.log(`Contacts: ${Object.keys(contactMapping).length}`);
    console.log(`Conversations: ${Object.keys(conversationMapping).length}`);
    console.log(`Messages: ${messageCount}`);
    
    // Guardar mapeo para rollback
    const fs = require('fs');
    const mapping = {
      workspace_id: workspaceId,
      users: userMapping,
      contacts: contactMapping,
      conversations: conversationMapping,
      migration_date: new Date().toISOString()
    };
    
    fs.writeFileSync('migration_mapping.json', JSON.stringify(mapping, null, 2));
    console.log('\n💾 Migration mapping saved to migration_mapping.json');
    
  } catch (error) {
    console.error('\n💥 MIGRATION FAILED:', error);
    throw error;
  }
}

// Ejecutar migración
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };