const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Tải biến môi trường từ file .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./configs/db');
const testRoutes = require('./routes/testRoutes');

// Kết nối cơ sở dữ liệu MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Travelio Backend is running' });
});

// Test routes (MongoDB Atlas connection test)
app.use('/api/test', testRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

