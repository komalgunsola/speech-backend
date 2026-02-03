const { Client } = require('pg');

console.log('🔧 Fixing Supabase Table Structure...\n');

const client = new Client({
  connectionString: 'postgresql://postgres:Komal%40supabase@db.vixrzcusbmpabhfqmkuv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixTable() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Step 1: Check current table structure
    console.log('1. Checking current table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Step 2: Add missing columns
    console.log('\n2. Adding missing columns...');
    
    // Check if language column exists
    const languageExists = columns.rows.some(col => col.column_name === 'language');
    
    if (!languageExists) {
      await client.query(`
        ALTER TABLE transcriptions 
        ADD COLUMN language TEXT DEFAULT 'en'
      `);
      console.log('✅ Added "language" column with default value "en"');
    } else {
      console.log('✅ "language" column already exists');
    }

    // Step 3: Make columns NOT NULL if needed
    console.log('\n3. Updating column constraints...');
    
    const nullableColumns = ['filename', 'original_name', 'text'];
    for (const col of nullableColumns) {
      const column = columns.rows.find(c => c.column_name === col);
      if (column && column.is_nullable === 'YES') {
        await client.query(`
          ALTER TABLE transcriptions 
          ALTER COLUMN ${col} SET NOT NULL
        `);
        console.log(`✅ Made "${col}" NOT NULL`);
      }
    }

    // Step 4: Insert test data
    console.log('\n4. Testing with sample data...');
    const testData = [
      ['test1.wav', 'recording1.wav', 'This is test transcription one.', 'en'],
      ['test2.mp3', 'meeting.mp3', 'This is test transcription two.', 'en'],
      ['test3.m4a', 'spanish_recording.m4a', 'Esta es una prueba en español.', 'es']
    ];

    for (const [filename, original_name, text, language] of testData) {
      const result = await client.query(`
        INSERT INTO transcriptions (filename, original_name, text, language)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [filename, original_name, text, language]);
      console.log(`✅ Inserted: ${original_name} (ID: ${result.rows[0].id})`);
    }

    // Step 5: Verify final structure
    console.log('\n5. Final table structure:');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'transcriptions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n' + '='.repeat(60));
    console.log('COLUMN NAME'.padEnd(20) + 'TYPE'.padEnd(20) + 'NULLABLE'.padEnd(15) + 'DEFAULT');
    console.log('='.repeat(60));
    
    finalColumns.rows.forEach(col => {
      console.log(
        col.column_name.padEnd(20) +
        col.data_type.padEnd(20) +
        col.is_nullable.padEnd(15) +
        (col.column_default || '')
      );
    });

    // Step 6: Count records
    const count = await client.query('SELECT COUNT(*) FROM transcriptions');
    console.log(`\n📄 Total records: ${count.rows[0].count}`);

    console.log('\n🎉 TABLE FIXED SUCCESSFULLY!');
    console.log('\n🚀 Now run: node server.js');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('duplicate column')) {
      console.log('\n⚠️  Column already exists. Running alternative fix...');
      await alternativeFix();
    }
  } finally {
    await client.end();
  }
}

async function alternativeFix() {
  try {
    console.log('\n🔄 Running alternative fix...');
    
    // Drop and recreate table
    await client.query('DROP TABLE IF EXISTS transcriptions CASCADE');
    
    console.log('🗑️  Old table dropped');
    
    // Create new table with correct structure
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
      
      ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Allow all operations" ON transcriptions
        FOR ALL USING (true) WITH CHECK (true);
    `);
    
    console.log('✅ New table created with correct structure');
    
  } catch (error) {
    console.error('❌ Alternative fix failed:', error.message);
  }
}

fixTable();