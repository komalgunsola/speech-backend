const fs = require('fs');
const path = require('path');

console.log('🧪 Testing .env loading...\n');

// Check current directory
console.log('Current directory:', __dirname);
console.log('Working directory:', process.cwd());

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
console.log('\nLooking for .env at:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found!');
  
  // Read and display content (hiding sensitive info)
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('\n📄 .env content:');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.trim() && !line.trim().startsWith('#')) {
      if (line.includes('ASSEMBLYAI_API_KEY')) {
        const parts = line.split('=');
        if (parts[1]) {
          const key = parts[1].trim();
          console.log(`   ${parts[0]}=${key.substring(0, 4)}...${key.substring(key.length - 4)}`);
        }
      } else if (line.includes('SUPABASE_DB_URL')) {
        const safeLine = line.replace(/:[^:]*@/, ':****@');
        console.log(`   ${safeLine}`);
      } else {
        console.log(`   ${line}`);
      }
    }
  });
} else {
  console.log('❌ .env file NOT found!');
  
  // Create it
  console.log('\n🔧 Creating .env file...');
  const envContent = `PORT=5000
ASSEMBLYAI_API_KEY=f98ae3914e2245ba80e796fccf8b2689
SUPABASE_DB_URL=postgresql://postgres:Komal%40supabase@db.vixrzcusbmpabhfqmkuv.supabase.co:5432/postgres`;
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ Created new .env file');
}

// Now test dotenv loading
console.log('\n🔍 Testing dotenv loading...');
require('dotenv').config({ path: envPath });

console.log('\n📋 Loaded variables:');
console.log('   PORT:', process.env.PORT);
console.log('   ASSEMBLYAI_API_KEY present:', !!process.env.ASSEMBLYAI_API_KEY);
console.log('   ASSEMBLYAI_API_KEY length:', process.env.ASSEMBLYAI_API_KEY?.length || 0);
console.log('   SUPABASE_DB_URL present:', !!process.env.SUPABASE_DB_URL);

if (process.env.ASSEMBLYAI_API_KEY) {
  console.log('   Key (first/last 4):', 
    process.env.ASSEMBLYAI_API_KEY.substring(0, 4) + '...' + 
    process.env.ASSEMBLYAI_API_KEY.substring(process.env.ASSEMBLYAI_API_KEY.length - 4)
  );
}