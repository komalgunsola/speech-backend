// test-assemblyai.js
const axios = require('axios');
require('dotenv').config();

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

console.log('🧪 Testing AssemblyAI API Key...');
console.log('Key present:', ASSEMBLYAI_API_KEY ? 'Yes' : 'No');

if (ASSEMBLYAI_API_KEY) {
  console.log('Testing authentication...');
  
  axios.get('https://api.assemblyai.com/v2/account', {
    headers: {
      'authorization': ASSEMBLYAI_API_KEY
    }
  })
  .then(response => {
    console.log('✅ AssemblyAI API Key is VALID!');
    console.log('Account Tier:', response.data.tier);
    console.log('Characters used:', response.data.rtc_seconds_used || 0);
    console.log('Characters limit:', response.data.rtc_seconds_limit || 'Not specified');
  })
  .catch(error => {
    console.log('❌ AssemblyAI API Key is INVALID or expired');
    console.log('Error:', error.response?.data || error.message);
  });
}