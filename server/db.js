const mongoose = require('mongoose');
require('dotenv').config();
// const autoIncrement = require('mongoose-auto-increment');
// const initMongooseAutoIncrement = require('../plugin/autoincremental')

const uri = process.env.URI;

let isConnected = false; // Track connection state

// Connect to MongoDB
const connectDB = async () => {
    if (isConnected) {
        console.log('Using existing database connection');
        // Initialize mongoose-auto-increment
        // await initMongooseAutoIncrement();
        return;
    }

    try {
        const conn = await mongoose.connect(
            uri
        );
        isConnected = true;
        // Initialize mongoose-auto-increment
        // await initMongooseAutoIncrement();
        // const { mongoose, autoIncrement } = await initMongooseAutoIncrement();
        console.log(`Connected to MongoDB: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);

    }
};

module.exports = connectDB;
