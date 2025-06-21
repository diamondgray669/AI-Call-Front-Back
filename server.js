import { Tw2GemServer } from './packages/tw2gem-server/dist/index.js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '12001', 10);

// Validate required environment variables
const requiredEnvVars = ['GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file or environment configuration.');
    process.exit(1);
}

// Create TW2GEM Server instance
const server = new Tw2GemServer({
    serverOptions: {
        port: PORT
    },
    geminiOptions: {
        server: {
            apiKey: process.env.GEMINI_API_KEY,
        },
        setup: {
            model: 'models/gemini-2.0-flash-live-001',
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: process.env.VOICE_NAME || 'Puck'
                        }
                    },
                    languageCode: process.env.LANGUAGE_CODE || 'en-US'
                },
            },
            systemInstruction: {
                parts: [{ 
                    text: process.env.SYSTEM_INSTRUCTION || 
                          'You are a professional AI assistant for customer service calls. IMPORTANT: You MUST speak first immediately when the call connects. Start with a warm greeting like "Hello! Thank you for calling. How can I help you today?" Be helpful, polite, and efficient. Always initiate the conversation and maintain a friendly, professional tone throughout the call.'
                }]
            },
            tools: []
        }
    }
});

// Event handlers
server.onNewCall = (socket) => {
    console.log('📞 New call from Twilio:', socket?.twilioStreamSid || 'Unknown');
    console.log('🕐 Call started at:', new Date().toISOString());
};

server.geminiLive.onReady = (socket) => {
    console.log('🤖 Gemini Live connection ready for call:', socket?.twilioStreamSid || 'Unknown');
    
    // Send initial greeting to ensure AI speaks first
    setTimeout(() => {
        if (socket?.geminiLive && socket.geminiLive.readyState === 1) {
            const initialMessage = {
                client_content: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: 'Please greet the caller now. Say hello and ask how you can help them today.' }]
                    }],
                    turn_complete: true
                }
            };
            socket.geminiLive.send(JSON.stringify(initialMessage));
            console.log('👋 Sent initial greeting prompt to Gemini for call:', socket?.twilioStreamSid || 'Unknown');
        }
    }, 500);
};

server.geminiLive.onClose = (socket) => {
    console.log('🔌 Gemini Live connection closed for call:', socket?.twilioStreamSid || 'Unknown');
};

server.onError = (socket, event) => {
    console.error('❌ Server error:', event);
};

server.onClose = (socket, event) => {
    console.log('📴 Call ended:', socket?.twilioStreamSid || 'Unknown');
    console.log('🕐 Call ended at:', new Date().toISOString());
};

// Start the server
server.start();

// Health check and API server
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve static files from frontend/dist
const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
        twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured',
        port: PORT,
        version: '1.0.0'
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        service: 'AI Calling Backend',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        configuration: {
            voice: process.env.VOICE_NAME || 'Puck',
            language: process.env.LANGUAGE_CODE || 'en-US',
            gemini_configured: !!process.env.GEMINI_API_KEY,
            twilio_configured: !!process.env.TWILIO_ACCOUNT_SID
        }
    });
});

// API endpoint for Twilio webhook configuration
app.get('/api/twilio-config', (req, res) => {
    res.json({
        accountSid: process.env.TWILIO_ACCOUNT_SID || 'Not configured',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
        webhookUrl: `ws://${req.headers.host || 'localhost:' + PORT}`
    });
});

// TwiML response for incoming voice calls
app.post('/', (req, res) => {
    console.log('📞 Received incoming call webhook');
    console.log('📞 Call SID:', req.body.CallSid);
    console.log('📞 From:', req.body.From);
    console.log('📞 To:', req.body.To);
    
    // Use the correct domain for the WebSocket URL - WITHOUT port for better compatibility
    // Most cloud providers automatically route WebSocket traffic through their load balancers
    const domain = 'work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev';
    
    // Generate TwiML response - without port for better compatibility with cloud providers
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://${domain}">
            <Parameter name="direction" value="inbound" />
        </Stream>
    </Connect>
</Response>`;
    
    // Send TwiML response
    res.type('text/xml');
    res.send(twiml);
    console.log('📤 Sent TwiML response for incoming call');
    console.log('📤 WebSocket URL:', `wss://${domain}`);
});

// Root API endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'AI Calling Backend Server',
        status: 'running',
        endpoints: {
            health: '/health',
            status: '/status',
            twilioConfig: '/api/twilio-config',
            webhook: `ws://localhost:${PORT}` // WebSocket endpoint for Twilio
        }
    });
});

// Catch-all route to serve the frontend for any other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 AI Calling Backend Server started successfully!');
    console.log(`📞 TW2GEM Server running on port ${PORT}`);
    console.log(`🔗 Twilio webhook URL: https://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev`);
    console.log(`🔗 WebSocket URL: wss://work-2-unsprsgldmecsdco.prod-runtime.all-hands.dev`);
    console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`📞 Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log('📋 Ready to receive calls!');
});