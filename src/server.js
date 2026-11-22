require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and add a long random secret.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Copy .env.example to .env and configure MongoDB.');
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/user.routes');
const tableRoutes = require('./routes/table.routes');
const reservationRoutes = require('./routes/reservation.routes');

const app = express();
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin(origin, callback) {
    // Non-browser clients omit Origin; browser clients must match the allowlist.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'serein-api' }));
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 3001;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Serein API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
