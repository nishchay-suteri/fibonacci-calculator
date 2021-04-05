const redis = require("redis");
const keys = require("./keys")

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // if redis connection is lost, retry to connect with redis in every 1 second
})

const sub = redisClient.duplicate(); // TODO: I think this is done to avoid the recursive insert events on redisClient. Need to check??

const fib = (index) => {
    if(index < 2)
        return 1;
    return fib(index-1) + fib(index-2);
}

sub.on("message", (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message))); // hset means hash
    // key is message, value is fib(message)
}); // anytime "message event" is received on sub, call the callback function

sub.subscribe('insert'); // the "message event" => INSERT on redis