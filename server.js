import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 3005

async function start() {
    await connectDB();
    app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
}

start();

