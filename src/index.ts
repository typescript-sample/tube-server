import { json } from 'body-parser';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';
import { createContext } from './init';
import { route } from './route';
import { connectToDb } from './services/mongo/mongo';

dotenv.config();

const app = express();
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  next();
});
app.use(json());

const port = process.env.PORT;
const mongoURI = process.env.MONGO_URI;
const mongoDB = process.env.MONGO_DB;

connectToDb(`${mongoURI}`, `${mongoDB}`).then(db => {
  const ctx = createContext(db);
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
});
