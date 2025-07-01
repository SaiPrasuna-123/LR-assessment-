// db.js
require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({
  user: process.env.user,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: 5433,
});

pool
  .connect()
  .then(() => console.log("Connected to the database!"))
  .catch((err) => console.error("Connection error", err.stack));

module.exports = pool;
