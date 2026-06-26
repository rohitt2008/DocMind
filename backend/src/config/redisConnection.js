const IORedis = require('ioredis');

// BullMQ requires a Redis connection. Default local Redis settings work fine here.
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null // required by BullMQ
});

module.exports = connection;