const keys = require("./keys");

/* 
 * Express App Setup
*/
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json())

/* 
 * Postgres Client setup
*/
const {Pool} = require("pg")
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});

pgClient.on('connect', () => {
  // ensure that we delay the table query until after a connection is made.
  // Database Table Name: values
  // Database Table schema: 1 column => number (datatype: INT) [ONLY storing the indices of submitted query, not storing the calculated fib values]
  pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

/*
 * Redis Client Setup
*/
const redis = require("redis");

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // if redis connection is lost, retry to connect with redis in every 1 second
});

// As per the redis docs, if pub-sub is used for redis, it can't perfoem any other operations(like insert), thats why, duplicate is done for separate pub-sub handling
const redisPublisher = redisClient.duplicate()

/*
 * Express Route Handlers
*/
app.get("/", (req,res) => {
  res.send("Hi");
});

app.get("/values/all", async (req,res) => {
  const values = await pgClient.query("SELECT * from values");
  // values contains extra information(like how much time query took, what tables were touched, etc)
  // we need just the rows property.
  res.send(values.rows);
});

app.get('/values/current', async (req,res) => {
  // get all (field, value) pairs for 'values' key
  redisClient.hgetall('values', (err,values) => {
    res.send(values);
  })
})

app.post('/values', async (req,res) => {
  const index = req.body.index;

  // TODO: Remove this drawback of app.
  if(parseInt(index) > 40){
    return res.status(422).send('Index is too high');
  }

  // HSET key field value
  // Key : hash('values')
  // field: index
  // value: 'nothing yet'
  redisClient.hset('values', index, 'nothing yet!');
  redisPublisher.publish('insert', index);
  await pgClient.query("INSERT INTO values(number) VALUES($1)",[index]);

  res.send({worling: true});
})

app.listen(5000, err=> console.log("Listening"));