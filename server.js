const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CORS CONFIGURATION ============
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5175',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5174',
    'https://yourdomain.com',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// ============ MIDDLEWARE ============
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(uploadDir));

// ============ ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/images', authRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is healthy!',
        timestamp: new Date().toISOString()
    });
});

// ============ DATABASE CONNECTION ============
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ Connected to MongoDB");
        return true;
    } catch (err) {
        console.error("❌ Error connecting to MongoDB:", err.message);
        return false;
    }
};

// Start server only after DB connection
const startServer = async () => {
    const connected = await connectDB();
    if (connected) {
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📍 http://localhost:${PORT}`);
        });
    } else {
        console.log("❌ Failed to connect to MongoDB. Server not started.");
        process.exit(1);
    }
};

startServer();

module.exports = app;