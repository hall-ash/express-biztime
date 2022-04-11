/** Database setup for BizTime. */

const { Client } = require('pg');

const BASE_URI = 'postgresql:///biztime';
const test_env = process.env.NODE_ENV === 'test';
const DB_URI = test_env ? BASE_URI + '_test' : BASE_URI;

const db = new Client({
  connectionString: DB_URI
});

db.connect();

module.exports = db;
