const { Client } = require('pg');
require('dotenv').config();

console.log('🔗 Testing Supabase Connection...\n');

// Your connection string with encoded password
const connectionString = 'postgresql://postgres:Komal%40supabase@db.vixrzcusbmpabhfqmkuv.supabase.co:5432/postgres';

console.log('Project: speech-project');
console.log('Project ID: vixrzcusbmpabhfqmkuv');
console.log('Host: db.vixrzcusbmpabhfqmkuv.supabase.co');
console.log('Password: Komal@supabase (encoded as Komal%40supabase)');

async function testConnection() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('\n✅ CONNECTED TO SUPABASE!');
    
    // Test 1: Get database time
    const timeResult = await client.query('SELECT NOW()');
    console.log('📅 Database Time:', timeResult.rows[0].now);
    
    // Test 2: List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Tables in database:');
    if (tablesResult.rows.length === 0) {
      console.log('   No tables found');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    // Test 3: Check if transcriptions table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transcriptions'
      )
    `);
    
    console.log('\n🎤 Transcriptions table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Test 4: Get column info
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'transcriptions'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Table structure:');
      columnsResult.rows.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Test 5: Insert test data
      console.log('\n🧪 Inserting test data...');
      const insertResult = await client.query(`
        INSERT INTO transcriptions (filename, original_name, text, language)
        VALUES ('test-file.wav', 'test_recording.wav', 'This is a test transcription from connection test.', 'en')
        RETURNING id, created_at
      `);
      
      console.log('✅ Test record created. ID:', insertResult.rows[0].id);
      
      // Test 6: Count records
      const countResult = await client.query('SELECT COUNT(*) FROM transcriptions');
      console.log('📄 Total records:', countResult.rows[0].count);
    } else {
      console.log('\n🔧 Creating transcriptions table...');
      await client.query(`
        CREATE TABLE transcriptions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          text TEXT NOT NULL,
          language TEXT DEFAULT 'en',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);
      `);
      console.log('✅ Table created successfully');
    }
    
    await client.end();
    console.log('\n🎉 SUPABASE CONNECTION SUCCESSFUL!');
    console.log('\n🚀 Now run: node server.js');
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED:', error.message);
    
    if (error.message.includes('password authentication')) {
      console.log('\n🔑 Password Authentication Error:');
      console.log('1. Check password: Komal@supabase');
      console.log('2. Make sure password is correct in Supabase');
      console.log('3. Try resetting password in Supabase Dashboard');
    } else if (error.message.includes('getaddrinfo')) {
      console.log('\n🌐 Network Error:');
      console.log('1. Check internet connection');
      console.log('2. Check hostname: db.vixrzcusbmpabhfqmkuv.supabase.co');
    } else if (error.message.includes('SSL')) {
      console.log('\n🔒 SSL Error:');
      console.log('Add ssl: { rejectUnauthorized: false } to connection');
    }
    
    console.log('\n🔧 Quick Fix:');
    console.log('1. Login to Supabase → Project Settings → Database');
    console.log('2. Copy the exact connection string from there');
    console.log('3. Use that in .env file');
  }
}

testConnection();