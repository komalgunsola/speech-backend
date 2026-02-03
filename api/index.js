const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Environment variables
const PORT = process.env.PORT || 5000;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('=== Environment Check ===');
console.log('PORT:', PORT);
console.log('DEEPGRAM_API_KEY:', DEEPGRAM_API_KEY ? 'Set' : 'Not set');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Not set');

// Initialize Supabase
let supabase;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.error('❌ Supabase initialization error:', error.message);
  }
} else {
  console.log('⚠️ Supabase credentials missing');
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    services: {
      deepgram: !!DEEPGRAM_API_KEY,
      supabase: !!supabase
    }
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Speech to Text API',
    endpoints: {
      live: 'POST /api/speech/live',
      upload: 'POST /api/speech/upload',
      health: 'GET /health'
    }
  });
});

// Live recording endpoint
app.post('/api/speech/live', upload.single('audio'), async (req, res) => {
  console.log('🎤 Live recording request');
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file' });
    }

    const { language = 'en', duration = 0 } = req.body;
    const audioFile = req.file;

    // Mock response if no Deepgram API key
    if (!DEEPGRAM_API_KEY) {
      const mockText = `🎤 Live Recording (Mock)\nDuration: ${duration}s\nLanguage: ${language}\n\nAdd DEEPGRAM_API_KEY to .env file`;
      
      // Try to save to database
      let dbResult = { success: false, message: 'Mock mode' };
      if (supabase) {
        dbResult = await saveToDatabase({
          text: mockText,
          language,
          audio_size: audioFile.size,
          duration,
          transcription_type: 'live'
        });
      }
      
      return res.json({
        success: true,
        text: mockText,
        mode: 'mock',
        database: dbResult
      });
    }

    // Transcribe with Deepgram
    const transcriptionResult = await transcribeDeepgram(audioFile.buffer, language, audioFile.mimetype);
    
    if (!transcriptionResult.success) {
      return res.status(500).json({
        success: false,
        error: transcriptionResult.error
      });
    }

    // Save to database
    let dbResult = { success: false, message: 'Database not configured' };
    if (supabase) {
      dbResult = await saveToDatabase({
        text: transcriptionResult.text,
        language,
        audio_size: audioFile.size,
        duration,
        confidence: transcriptionResult.confidence,
        transcription_type: 'live',
        word_count: transcriptionResult.word_count
      });
    }

    // Response
    return res.json({
      success: true,
      text: transcriptionResult.text,
      language,
      confidence: transcriptionResult.confidence,
      mode: 'deepgram',
      database: dbResult
    });

  } catch (error) {
    console.error('Live endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Processing failed'
    });
  }
});

// File upload endpoint
app.post('/api/speech/upload', upload.single('audio'), async (req, res) => {
  console.log('📁 File upload request');
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file' });
    }

    const { language = 'en' } = req.body;
    const audioFile = req.file;

    // Mock response if no Deepgram API key
    if (!DEEPGRAM_API_KEY) {
      const mockText = `📁 File: ${audioFile.originalname} (Mock)\nSize: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB\nLanguage: ${language}\n\nAdd DEEPGRAM_API_KEY to .env file`;
      
      let dbResult = { success: false, message: 'Mock mode' };
      if (supabase) {
        dbResult = await saveToDatabase({
          text: mockText,
          language,
          audio_size: audioFile.size,
          file_name: audioFile.originalname,
          file_type: audioFile.mimetype,
          transcription_type: 'file_upload'
        });
      }
      
      return res.json({
        success: true,
        text: mockText,
        mode: 'mock',
        database: dbResult
      });
    }

    // Transcribe with Deepgram
    const transcriptionResult = await transcribeDeepgram(audioFile.buffer, language, audioFile.mimetype);
    
    if (!transcriptionResult.success) {
      return res.status(500).json({
        success: false,
        error: transcriptionResult.error
      });
    }

    // Save to database
    let dbResult = { success: false, message: 'Database not configured' };
    if (supabase) {
      dbResult = await saveToDatabase({
        text: transcriptionResult.text,
        language,
        audio_size: audioFile.size,
        file_name: audioFile.originalname,
        file_type: audioFile.mimetype,
        confidence: transcriptionResult.confidence,
        transcription_type: 'file_upload',
        word_count: transcriptionResult.word_count
      });
    }

    // Response
    return res.json({
      success: true,
      text: transcriptionResult.text,
      language,
      confidence: transcriptionResult.confidence,
      file_name: audioFile.originalname,
      mode: 'deepgram',
      database: dbResult
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Upload failed'
    });
  }
});

// Get transcriptions
app.get('/api/transcriptions', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        success: false,
        error: 'Database not configured',
        data: []
      });
    }

    const { limit = 50 } = req.query;
    
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Database error:', error);
      return res.json({
        success: false,
        error: error.message,
        data: []
      });
    }

    return res.json({
      success: true,
      data: data || [],
      count: (data || []).length
    });

  } catch (error) {
    console.error('Get transcriptions error:', error);
    return res.json({
      success: false,
      error: 'Failed to fetch transcriptions',
      data: []
    });
  }
});

// Helper functions
async function transcribeDeepgram(audioBuffer, language, mimeType) {
  try {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer
    });

    const data = await response.json();
    
    if (data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      return {
        success: true,
        text: data.results.channels[0].alternatives[0].transcript,
        confidence: data.results.channels[0].alternatives[0].confidence,
        word_count: data.results.channels[0].alternatives[0].words?.length || 0
      };
    } else {
      throw new Error('No transcription received');
    }
  } catch (error) {
    console.error('Deepgram error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function saveToDatabase(data) {
  try {
    const dbData = {
      text: data.text,
      language: data.language || 'en',
      audio_size: data.audio_size || 0,
      duration: data.duration || 0,
      file_name: data.file_name || null,
      file_type: data.file_type || null,
      confidence: data.confidence || null,
      transcription_type: data.transcription_type || 'live',
      word_count: data.word_count || 0,
      char_count: data.text ? data.text.length : 0,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('transcriptions')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Database save error:', error);
      
      // If table doesn't exist
      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Table not found',
          message: 'Create "transcriptions" table in Supabase'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Saved to database. ID:', result.id);
    return {
      success: true,
      data: result,
      message: 'Saved successfully'
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🎤 Deepgram: ${DEEPGRAM_API_KEY ? '✅' : '❌'}`);
  console.log(`🗄️ Supabase: ${supabase ? '✅' : '❌'}`);
  console.log('============================\n');
});

module.exports = app;