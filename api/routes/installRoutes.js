const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Utility to check if installation already done
function isInstalled() {
  return process.env.DB_HOST && process.env.DB_HOST.trim() !== '';
}

const envPath = path.join(__dirname, '../../.env');
const sqlPath = path.join(__dirname, '../talkdrove.sql');

router.get('/install', (req, res) => {
  if (isInstalled()) {
    return res.status(404).send('Installation already completed.');
  }
  res.render('install');
});

router.post('/install/check-db', async (req, res) => {
  const { host, user, password, database, port } = req.body;
  try {
    const connection = await mysql.createConnection({ host, user, password, database, port: port || 3306 });
    await connection.end();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post('/install', async (req, res) => {
  if (isInstalled()) {
    return res.status(400).send('Already installed.');
  }
  const { host, user, password, database, port, adminUsername, adminEmail, adminPassword } = req.body;
  try {
    const connection = await mysql.createConnection({ host, user, password, database, port: port || 3306, multipleStatements: true });
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await connection.query(sql);
    const hashed = await bcrypt.hash(adminPassword, 10);
    await connection.query('INSERT INTO users (username, email, password, is_admin, is_verified) VALUES (?, ?, ?, 1, 1)', [adminUsername, adminEmail, hashed]);
    await connection.end();

    // Update .env with DB details
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^DB_HOST=.*/m, `DB_HOST=${host}`);
    envContent = envContent.replace(/^DB_USER=.*/m, `DB_USER=${user}`);
    envContent = envContent.replace(/^DB_PASSWORD=.*/m, `DB_PASSWORD=${password}`);
    envContent = envContent.replace(/^DB_NAME=.*/m, `DB_NAME=${database}`);
    fs.writeFileSync(envPath, envContent);

    res.render('install_success');

    // remove install files after sending response
    setTimeout(() => {
      try {
        fs.unlinkSync(path.join(__dirname, 'installRoutes.js'));
        fs.unlinkSync(path.join(__dirname, '../../views/install.ejs'));
        fs.unlinkSync(path.join(__dirname, '../../views/install_success.ejs'));
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 1000);
  } catch (err) {
    res.status(500).send('Installation failed: ' + err.message);
  }
});

module.exports = router;
