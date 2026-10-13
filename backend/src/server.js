const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Tải biến môi trường từ file .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./configs/db');
const env = require('./configs/env');
const testRoutes = require('./routes/testRoutes');
const authTestRoutes = require('./routes/authTestRoutes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

// Kết nối cơ sở dữ liệu MongoDB
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Travelio Backend is running' });
});

// Test routes (MongoDB Atlas connection test)
app.use('/api/test', testRoutes);
app.use('/api/test/auth', authTestRoutes);

const { Amenity, SystemConfig } = require('./models');

const DEFAULT_BED_TYPES = [
  'Single Bed',
  'Semi Double-Bed',
  'Double Bed',
  'Queen Bed',
  'King Bed',
  'Super King Bed',
  'Bunk Bed',
  'Sofa Bed',
  'Japanese Futon',
  'Male Capsule',
  'Female Capsule'
];

// API danh mục loại giường động từ DB
app.get('/api/categories/bed-types', async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ config_key: 'BED_TYPES' });
    if (config && config.config_value) {
      try {
        const parsed = JSON.parse(config.config_value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json(parsed);
        }
      } catch (e) {
        // Fallback
      }
    }
    res.json(DEFAULT_BED_TYPES);
  } catch (err) {
    next(err);
  }
});

// API danh mục tiện ích / dịch vụ từ DB
app.get('/api/amenities', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const amenities = await Amenity.find(filter).sort({ name: 1 });
    res.json(amenities);
  } catch (err) {
    next(err);
  }
});

// Auth & User routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});


