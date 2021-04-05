const redis = require("redis");
const keys = require("./keys");

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // if redis connection is lost, retry to connect with redis in every 1 second
});

const redisSubscriber = redisClient.duplicate(); // TODO: I think this is done to avoid the recursive insert events on redisClient. Need to check??

const fib = (index) => {
    if(index < 2)
        return 1;
    return fib(index-1) + fib(index-2);
}

redisSubscriber.on("message", (channel, message) => {
    // HSET key field value
    // Key : hash('values')
    // field: message
    // value: fib(message)
    redisClient.hset('values', message, fib(parseInt(message))); // hset means hash
});

redisSubscriber.subscribe('insert'); // This is the channel on which the subscriber is subscribed