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
    const usernameExists = await db.collection('users').findOne({ username: user.username });
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
  // tweet.createdAt = new Date();
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

app.get("/tweets", async (req, res) => {
  try {
    const tweets = await db.collection('tweets').find().sort({ _id: -1 }).toArray();
    if (tweets.length === 0) return res.status(httpStatus.OK).send([]);
    const avatarTweets = await Promise.all(tweets.map(async (tweet) => {
      const avatar = await db.collection('users').findOne({ username: tweet.username });
      return { ...tweet, avatar: avatar.avatar };
    }));
    res.status(httpStatus.OK).send(avatarTweets);
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error.message);
  }
})

app.put("/tweets/:id", async (req, res) => {
  const { id } = req.params;
  const tweet = req.body;
  // Joi schema validation
  const validationResult = validadeBody(tweet);
  if (!validationResult.isValid) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).send(validationResult.messages);
  }
  // Update tweet in the database
  try {
    // Check if tweet exists
    const tweetExists = await db.collection('tweets').findOne({ _id: new ObjectId(id) });
    if (!tweetExists) {
      return res.status(httpStatus.NOT_FOUND).send('Tweet not found');
    }
    // Check if user is the owner of the tweet
    if (tweetExists.username !== tweet.username) {
      return res.status(httpStatus.UNAUTHORIZED).send('You can only update your own tweets');
    }
    // Update tweet
    await db.collection('tweets').updateOne({ _id: new ObjectId(id) }, { $set: { tweet: tweet.tweet } });
    res.status(httpStatus.NO_CONTENT).send('Tweet updated');
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error.message);
  }
})

app.delete("/tweets/:id", async (req, res) => {
  const {id} = req.params;
  try {
    const deleted = await db.collection('tweets').deleteOne({ _id: new ObjectId(id) });
    if (deleted.deletedCount === 0) {
      return res.status(httpStatus.NOT_FOUND).send('Tweet not found');
    }
    return res.status(httpStatus.NO_CONTENT).send('Tweet deleted');
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error.message);
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