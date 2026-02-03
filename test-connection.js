const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔗 Testing MongoDB Atlas Connection...');
    console.log('🔑 Connection String:', process.env.MONGODB_URI ? 'Present' : 'Missing');
    
    // Simple connection without deprecated options
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB Atlas!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('📈 Connection State:', mongoose.connection.readyState);
    
    // Create a test collection
    const Test = mongoose.model('Test', new mongoose.Schema({ 
      name: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    const testDoc = await Test.create({ name: 'Connection Test' });
    console.log('✅ Test document created! ID:', testDoc._id);
    
    // Find all test docs
    const docs = await Test.find();
    console.log('📄 Total test documents:', docs.length);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Available Collections:');
    collections.forEach(col => console.log('  -', col.name));
    
    await mongoose.disconnect();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    // Detailed error analysis
    if (error.message.includes('bad auth')) {
      console.log('\n🔑 Authentication Error: Check username/password in MONGODB_URI');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Error: Check internet connection');
    } else if (error.message.includes('MongoParseError')) {
      console.log('\n🔧 Connection String Error: Check MONGODB_URI format');
    }
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check .env file for MONGODB_URI');
    console.log('2. Make sure password is URL encoded (special characters)');
    console.log('3. Check IP whitelist in MongoDB Atlas (add 0.0.0.0/0)');
    console.log('4. Check if cluster is created and running');
    
    process.exit(1);
  }
}

testConnection();