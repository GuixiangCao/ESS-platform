const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform')
.then(() => console.log('✓ MongoDB connected'))
.catch(err => {
  console.error('⚠️  MongoDB connection error:', err.message);
  console.log('💡 提示: 请确保 MongoDB 服务正在运行');
  console.log('   - 本地运行: brew services start mongodb-community');
  console.log('   - 或使用 MongoDB Atlas 云服务');
});

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const boardRoutes = require('./routes/boards');
const taskRoutes = require('./routes/tasks');
const resellerRoutes = require('./routes/resellers');
const deviceRoutes = require('./routes/devices');
const staffRoutes = require('./routes/staff');
const stationRevenueRoutes = require('./routes/stationRevenue');
const revenueLossRoutes = require('./routes/revenueLoss');
const alarmRoutes = require('./routes/alarms');
const electricityPriceRoutes = require('./routes/electricityPrices');
const stationGatewayRoutes = require('./routes/stationGateways');
const chargingStrategyRoutes = require('./routes/chargingStrategies');
const socRoutes = require('./routes/soc');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/resellers', resellerRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/resellers', staffRoutes);
app.use('/api/revenue', stationRevenueRoutes);
app.use('/api/revenue', revenueLossRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/electricity-prices', electricityPriceRoutes);
app.use('/api/station-gateways', stationGatewayRoutes);
app.use('/api/charging-strategies', chargingStrategyRoutes);
app.use('/api/soc', socRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ESS Platform Backend is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
