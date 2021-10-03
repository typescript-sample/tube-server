import { json } from 'body-parser';
import { ArrayOrObject, auth, Client, QueryOptions, types } from 'cassandra-driver';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';
import { Db } from 'mongodb';
import { connectToDb } from 'mongodb-extension';
import { createContext } from './init';
import { route } from './route';


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

const db = process.env.DB;
const port = process.env.PORT;
const mongoURI = process.env.MONGO_URI;
const mongoDB = process.env.MONGO_DB;
const apiKey = process.env.API_KEY;
if (db === 'mongo') {
  connectToDb(`${mongoURI}`, `${mongoDB}`).then(mdb => start(apiKey, mdb));
} else {
  start(apiKey);
}

function start(key: string, mdb?: Db) {
  const ctx = createContext(key, mdb);
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
}
/*
pool.connect().then( () => {
  const ctx = createContext(undefined, apiKey);
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
  console.log('Connected successfully to PostgreSQL.');
})
.catch(e => {
  console.error('Failed to connect to PostgreSQL.', e.message, e.stack);
});
*/

// const port = process.env.PORT;
// const url = process.env.CASSANDRA_URI.split(", ");
// const keyspace = process.env.KEYSPACE;
// const localDataCenter = process.env.LOCALDATACENTER;
// const userCassandra = process.env.CASSANDRA_USER;
// const passwordCassandra = process.env.CASSANDRA_PASS;
// const apiKey = process.env.API_KEY;

// connectToDb(url, keyspace , localDataCenter ,userCassandra,passwordCassandra).then(db => {
//   const ctx = createContext(apiKey,db);
//   route(app, ctx);
//   http.createServer(app).listen(port, () => {
//     console.log('Start server at port ' + port);
//   });
// });

// export async function connectToDb(url:string[],keyspaceName:string,dataCenter:string,userDb:string,passworDb)  {
//   try{
//     const client = new Client({
//       contactPoints: url,
//       localDataCenter: dataCenter,
//       authProvider: new auth.DsePlainTextAuthProvider(userDb, passworDb),
//     });
//     client.keyspace = keyspaceName;
//     await client.connect();
//     console.log("Connect cassandra success");
//     return client;
//   }catch(err){
//     console.log("Database error:",err);
//     return err;
//   }
// }
