const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Placeholder for user routes
router.get('/profile', auth, (req, res) => {
  res.json({ message: 'User profile endpoint' });
});

module.exports = router;
