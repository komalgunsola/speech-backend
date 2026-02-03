const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Deepgram API Key - FREE 250 hours/month
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

// ========== DEEPGRAM TRANSCRIPTION ==========
async function transcribeWithDeepgram(buffer, language) {
  // Convert buffer to base64
  const audioBase64 = buffer.toString('base64');
  
  const response = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mimetype: 'audio/webm',
      language: language || 'en',
      punctuate: true,
      utterances: true,
      diarize: false,
      smart_format: true
    })
  });

  const data = await response.json();
  
  if (data.results && data.results.channels && data.results.channels[0].alternatives) {
    return data.results.channels[0].alternatives[0].transcript;
  }
  
  throw new Error('No transcription received');
}

// ========== LIVE ENDPOINT ==========
app.post('/api/speech/live', upload.single('audio'), async (req, res) => {
  console.log('🎤 Live recording request (Deepgram)');
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file' 
      });
    }

    console.log('Audio received:', req.file.size, 'bytes');

    // If no API key, return mock
    if (!DEEPGRAM_API_KEY) {
      return res.json({
        success: true,
        text: `🎤 Live Recording (Mock Mode)\n\nDuration: ${req.body.duration || 'unknown'} seconds\nSize: ${(req.file.size / 1024).toFixed(1)} KB\n\nDeepgram would transcribe your audio here.\n\n💡 Get FREE API key from:\n1. Go to deepgram.com\n2. Sign up (FREE - 250 hours/month)\n3. Add DEEPGRAM_API_KEY to environment`,
        mode: 'mock'
      });
    }

    try {
      // Direct uplo
      console.log('Transcribing with Deepgram...');
      
      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': req.file.mimetype,
        },
        body: req.file.buffer
      });

      const data = await response.json();
      console.log('Deepgram response:', data);
      
      if (data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        const transcript = data.results.channels[0].alternatives[0].transcript;
        
        return res.json({
          success: true,
          text: transcript,
          language: req.body.language || 'en',
          confidence: data.results.channels[0].alternatives[0].confidence,
          mode: 'deepgram'
        });
      } else {
        // Try with parameters
        console.log('Trying with parameters...');
        
        const params = new URLSearchParams({
          language: req.body.language || 'en',
          punctuate: 'true',
          smart_format: 'true'
        });

        const response2 = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': req.file.mimetype,
          },
          body: req.file.buffer
        });

        const data2 = await response2.json();
        
        if (data2.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
          return res.json({
            success: true,
            text: data2.results.channels[0].alternatives[0].transcript,
            language: req.body.language || 'en',
            mode: 'deepgram'
          });
        } else {
          throw new Error('No transcript in response');
        }
      }
      
    } catch (transcriptionError) {
      console.error('Deepgram error:', transcriptionError.message);
      
      return res.json({
        success: false,
        text: `🎤 Deepgram Failed\n\nError: ${transcriptionError.message}\n\nTry:\n1. Get free API key from deepgram.com\n2. Record shorter audio (5-10 seconds)\n3. Speak clearly`,
        error: transcriptionError.message
      });
    }

  } catch (error) {
    console.error('Live endpoint error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Processing failed'
    });
  }
});

// ========== FILE UPLOAD ENDPOINT ==========
app.post('/api/speech/upload', upload.single('audio'), async (req, res) => {
  console.log('📤 File upload request (Deepgram)');
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file' 
      });
    }

    // If no API key, return mock
    if (!DEEPGRAM_API_KEY) {
      return res.json({
        success: true,
        text: `📁 File: ${req.file.originalname}\nSize: ${(req.file.size / 1024 / 1024).toFixed(2)} MB\n\nDeepgram would transcribe this file.\n\nGet FREE API key from deepgram.com`,
        mode: 'mock'
      });
    }

    try {
      // Upload to Deepgram
      const params = new URLSearchParams({
        language: req.body.language || 'en',
        punctuate: 'true',
        smart_format: 'true'
      });

      const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': req.file.mimetype,
        },
        body: req.file.buffer
      });

      const data = await response.json();
      
      if (data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        return res.json({
          success: true,
          text: data.results.channels[0].alternatives[0].transcript,
          language: req.body.language || 'en',
          confidence: data.results.channels[0].alternatives[0].confidence,
          mode: 'deepgram'
        });
      } else {
        throw new Error('No transcript received');
      }
      
    } catch (error) {
      console.error('File transcription error:', error);
      
      return res.json({
        success: false,
        text: `❌ File Transcription Failed\n\nError: ${error.message}\n\nTry converting to MP3 format.`,
        error: error.message
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Upload failed'
    });
  }
});

// ========== HEALTH & INFO ==========
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎤 Speech to Text API',
    provider: 'Deepgram',
    free_tier: '250 hours/month',
    endpoints: {
      upload: 'POST /api/speech/upload',
      live: 'POST /api/speech/live'
    },
    note: 'Better WebM support than AssemblyAI'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    deepgram: DEEPGRAM_API_KEY ? 'configured' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;