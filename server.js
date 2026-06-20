const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

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

// Your routes
app.use('/api/images', require('./routes/authRoutes.js'));
app.use('/api/auth', require('./routes/authRoutes.js'));

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
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("✅ Connected to MongoDB");
})
.catch((err) => {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
});

module.exports = app;