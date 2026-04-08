const mysql = require('mysql2/promise');
const dbConfig = require('./SQLcreds');
const pool = mysql.createPool(dbConfig);

module.exports = pool;