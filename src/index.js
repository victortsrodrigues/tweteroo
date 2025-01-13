import express, { json } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import joi from 'joi';
import dotenv from 'dotenv';
import httpStatus from "http-status";
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGO_URL);
try {
  await mongoClient.connect();
  console.log('MongoDB connected!');
} catch (error) {
  console.log(error.message);
}
let db = mongoClient.db();

// Post sign up
app.post("/sign-up", async (req, res) => {
  const user = req.body;
  // Joi schema validation
  const validationResult = validadeBody(user);
  if (!validationResult.isValid) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).send(validationResult.messages);
  }

  // Insert user in the database
  try {
    const usernameExists = await db.collection('users').findOne({ username: user.username});
    if (usernameExists) {
      return res.status(httpStatus.CONFLICT).send('Username already exists');
    }
    await db.collection('users').insertOne(user);
    res.status(httpStatus.CREATED).send('User created');
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error.message);
  }
})

app.post("/tweets", async (req, res) => {
  const tweet = req.body;
  // Joi schema validation
  const validationResult = validadeBody(tweet);
  if (!validationResult.isValid) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).send(validationResult.messages);
  }

  // Insert tweet in the database
  try {
    const usernameExists = await db.collection('users').findOne({ username: tweet.username });
    if (!usernameExists) {
      return res.status(httpStatus.UNAUTHORIZED).send('User not found');
    }
    await db.collection('tweets').insertOne(tweet);
    res.status(httpStatus.CREATED).send('Tweet created');
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error.message);
  }
})



// Dynamic Joi schema validation
function validadeBody(body) {
  const dynamicSchema = joi.object().pattern(joi.string(), joi.string().required());
  const validation = dynamicSchema.validate(body, { abortEarly: false });
  if (validation.error) {
    const messages = validation.error.details.map((detail) => detail.message);
    return { isValid: false, messages };
  }
  return { isValid: true };
}

// Port to run the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
})