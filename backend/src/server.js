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
const bookingRoutes = require('./routes/booking.routes');
const vendorRoutes = require('./routes/vendor.routes');
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

// Auth & User routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vendor', vendorRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});


