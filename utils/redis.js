/**
 * @Author Udara Premadasa
 * @module redis.client
 */

const redis = require("redis");
const multipleRedis = require("multiple-redis");
const logger = require("./logger");
const env = process.env;

/**
 * Redis client
 */
const client = redis.createClient({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
  password: env.REDIS_PASSWORD,
  socket_keepalive: env.SOCKET_KEEPALIVE
});

/**
 * Replication Redis Client
 */
const replica = redis.createClient({
  host: env.RP_REDIS_HOST,
  port: env.RP_REDIS_PORT,
  db: env.RP_REDIS_DB,
  password: env.RP_REDIS_PASSWORD,
  socket_keepalive: env.RP_SOCKET_KEEPALIVE
});

/**
 * Create Client for multiplication
 */
const multipleClient = multipleRedis.createClient([client, replica]);

exports.Client = {
  /**
   * get status about redis connection
   * @param {*} callback
   */
  start() {
    client.on("error", () => {
      logger.warn(`(Redis) Primary Connection Failed`);
    });
    client.on("connect", () => {
      logger.info(`(Redis) Primary connected to db - ${env.REDIS_DB}`);
    });
    replica.on("error", () => {
      logger.warn(`(Redis) Replica Connection Failed`);
    });
    replica.on("connect", () => {
      logger.info(`(Redis) Replica connected to db - ${env.RP_REDIS_DB}`);
    });
  },

  /**
   * Set data on redis
   * @param {*} key
   * @param {*} value
   * @param {*} callback
   */
  set(key, value, callback) {
    multipleClient.set(key, value, callback);
  },

  /**
   * Get data from redis
   * @param {*} key
   * @param {*} callback
   */
  get(key, callback) {
    multipleClient.get(key, callback);
  },

  /**
   * Delete data from redis
   * @param {*} key
   * @param {*} callback
   */
  del(key, callback) {
    multipleClient.del(key, callback);
  }
};