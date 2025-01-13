import express, { json } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(json());

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGO_URL);
try {
  await mongoClient.connect();
  console.log('MongoDB connected!');
} catch (error) {
  console.log(error.message);
}
let db = mongoClient.db();



// Port to run the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
})