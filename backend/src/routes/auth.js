const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register route
router.post('/register', [
  check('username', 'Username is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
], authController.register);

// Login route
router.post('/login', authController.login);

// Get current user
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;
