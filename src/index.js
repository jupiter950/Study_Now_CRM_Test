require('dotenv').config();

const app = require('./app');
const { connectDb } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDb();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
