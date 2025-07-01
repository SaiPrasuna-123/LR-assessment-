const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const PORT = 5000;
const pool = require("./db_connect");

// Constants
const MAX_USER_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const USER_LOCK_TIME = 15 * 60 * 1000; // 15 minutes

app.use(bodyParser.json());

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = new Date();

  try {
    // 1. IP Rate Limit
    const ipAttemptResult = await pool.query(
      `SELECT COUNT(*) FROM login_functionality.ip_attempts
             WHERE ip_address = $1 AND attempt_time > NOW() - INTERVAL '5 minutes'`,
      [ip]
    );

    if (parseInt(ipAttemptResult.rows[0].count) >= MAX_IP_ATTEMPTS) {
      return res.status(429).json({
        error: "Too many login attempts FROM this IP. Try again later.",
      });
    }

    // 2. Find user
    const userResult = await pool.query(
      "SELECT * FROM login_functionality.users WHERE username = $1",
      [username]
    );
    if (userResult.rowCount === 0) {
      await recordIpFailure(ip);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = userResult.rows[0];

    // 3. Check if user is suspended
    if (user.suspended_until && new Date(user.suspended_until) > now) {
      return res.status(403).json({
        error: `User suspended until ${user.suspended_until}`,
      });
    }

    // 4. Compare password
    const match = password == user.password_hash;

    if (!match) {
      // update user failed attempts
      let failedAttempts = user.failed_attempts + 1;
      let suspendedUntil = null;

      if (
        failedAttempts >= MAX_USER_ATTEMPTS &&
        new Date(user.last_failed_at || 0) > new Date(now - WINDOW_MS)
      ) {
        suspendedUntil = new Date(now.getTime() + USER_LOCK_TIME);
        failedAttempts = 0; // reset after suspension
      }

      await pool.query(
        `UPDATE login_functionality.users SET failed_attempts = $1, last_failed_at = $2, suspended_until = $3 WHERE id = $4`,
        [failedAttempts, now, suspendedUntil, user.id]
      );

      await recordIpFailure(ip);

      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Successful login - reset counters
    await pool.query(
      `UPDATE login_functionality.users SET failed_attempts = 0, last_failed_at = NULL, suspended_until = NULL WHERE id = $1`,
      [user.id]
    );

    return res.json({ success: true, message: "Login successful!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }

  async function recordIpFailure(ip) {
    await pool.query(
      `INSERT INTO login_functionality.ip_attempts (ip_address, attempt_time) VALUES ($1, NOW())`,
      [ip]
    );
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
