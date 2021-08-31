const mysql = require("mysql")
const logger = require("./logger")
const env = process.env

const dbconfig = {
    connectionLimit: env.MYSQL_POOL_SZIE,
    host: env.MYSQL_HOST,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    port: env.MYSQL_PORT,
    multipleStatements: true
}

const pool = mysql.createPool(dbconfig)

const getConnectionAsync = () => {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                return reject(err);
            }
            resolve(connection);
        });
    });
};

const queryAsync = (conn, sqlQuery) => {
    return new Promise((resolve, reject) => {
        conn.query(sqlQuery, (queryErr, result) => {
            if(queryErr) {
                return reject(queryErr)
            }
            resolve(result)
        })
    })
}

const queryDataAsync = (conn, sqlQuery, data) => {
    return new Promise((resolve, reject) => {
        conn.query(sqlQuery, data, (queryErr, result) => {
            if(queryErr) {
                return reject(queryErr)
            }
            resolve(result)
        })
    })
}

exports.Client = {
    /**
     * Check Can Connect to Database
     * @param {*} callback
     */
    connect(callback) {
        pool.getConnection((connectionErr, conn) => {
            if(connectionErr) {
                logger.warn("(SQL) connection error");
                callback(true);
            } else {
                logger.info(`(SQL) User ${env.MYSQL_USER} ${env.MYSQL_DATABASE} connected`);
                callback(false);
            }
        });
    },

  /**
   * execute query
   * @param {*} sqlQuery
   * @param {*} callback
   */
    execute(sqlQuery, callback){
        pool.getConnection((connectionErr, conn) => {
            if (connectionErr) {
                callback(false, null);
            } else {
                conn.query(sqlQuery, (queryErr, result) => {
                    callback(queryErr, result);
                });
                conn.release();
            }
        });
    },


    async executeAsync(sqlQuery){
        const conn = await getConnectionAsync()
        const result = await queryAsync(conn, sqlQuery)
        conn.release()
        return result
    },

    /**
     * execute query with data
     * @param {*} sqlQuery
     * @param {*} data
     * @param {*} callback
     */
    executeWithData(sqlQuery, data, callback) {
        pool.getConnection((connectionErr, conn) => {
            if (connectionErr) {
                callback(false, null);
            } else {
                conn.query(sqlQuery, data, (queryErr, result) => {
                    callback(queryErr, result);
                });
                conn.release();
            }
        });
    },

    async executeWithDataAsync(sqlQuery, data){
        const conn = await getConnectionAsync()
        const result = await queryDataAsync(conn, sqlQuery, data)
        conn.release()
        return result
    }
}