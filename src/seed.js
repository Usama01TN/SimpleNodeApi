require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./models/Table');

const seedTables = [
  { name: 'Window for two', capacity: 2, isAvailable: true },
  { name: 'Garden table', capacity: 2, isAvailable: true },
  { name: 'The corner table', capacity: 4, isAvailable: true },
  { name: 'Long lunch table', capacity: 4, isAvailable: true },
  { name: 'The gathering table', capacity: 6, isAvailable: true },
  { name: 'A little celebration', capacity: 8, isAvailable: true },
];

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Copy .env.example to .env first.');
  await mongoose.connect(process.env.MONGODB_URI);
  const currentCount = await Table.countDocuments();
  if (currentCount > 0) {
    console.log(`Skipped: ${currentCount} table records already exist.`);
    return;
  }
  await Table.insertMany(seedTables);
  console.log(`Seeded ${seedTables.length} Serein tables.`);
}

seed()
  .catch((error) => {
    console.error('Table seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
