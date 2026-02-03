const axios = require('axios');
require('dotenv').config();

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

async function testKey() {
  console.log('🔑 Testing AssemblyAI API Key...\n');
  
  if (!ASSEMBLYAI_API_KEY) {
    console.log('❌ ASSEMBLYAI_API_KEY not found in .env file');
    console.log('Add this to .env:');
    console.log('ASSEMBLYAI_API_KEY=f98ae3914e2245ba80e796fccf8b2689');
    return;
  }
  
  console.log('Key found (first 10 chars):', ASSEMBLYAI_API_KEY.substring(0, 10) + '...');
  
  try {
    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const accountResponse = await axios.get('https://api.assemblyai.com/v2/account', {
      headers: { 'authorization': ASSEMBLYAI_API_KEY }
    });
    
    console.log('✅ Authentication successful!');
    console.log('   Account status:', accountResponse.data.status || 'active');
    console.log('   Free minutes used:', accountResponse.data.rtc_seconds_used || 0);
    console.log('   Free minutes limit:', accountResponse.data.rtc_seconds_limit || 'Unlimited');
    
    // Test a small audio file
    console.log('\n🎤 Testing transcription with sample audio...');
    
    // Create a tiny test audio (silence)
    const testAudio = Buffer.alloc(1000); // 1KB of silence
    
    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      testAudio,
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream'
        }
      }
    );
    
    console.log('✅ Audio upload test passed');
    console.log('   Upload URL:', uploadResponse.data.upload_url.substring(0, 50) + '...');
    
  } catch (error) {
    console.error('\n❌ AssemblyAI test failed:');
    
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data?.error || error.response.statusText);
      
      if (error.response.status === 401) {
        console.log('\n🔧 Fix: Your API key is invalid or expired.');
        console.log('   1. Go to https://www.assemblyai.com/dashboard');
        console.log('   2. Copy new API key');
        console.log('   3. Update .env file');
      } else if (error.response.status === 402) {
        console.log('\n🔧 Fix: Free tier limit reached.');
        console.log('   AssemblyAI gives 3 free hours/month.');
        console.log('   Wait for reset or use mock mode for now.');
      }
    } else {
      console.log('   Error:', error.message);
    }
  }
}

testKey();