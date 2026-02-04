const express = require('express');
const boardController = require('../controllers/boardController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create board
router.post('/', auth, boardController.createBoard);

// Get user boards
router.get('/', auth, boardController.getUserBoards);

// Get board by ID
router.get('/:id', auth, boardController.getBoardById);

// Update board
router.put('/:id', auth, boardController.updateBoard);

// Delete board
router.delete('/:id', auth, boardController.deleteBoard);

// Add member to board
router.post('/:id/members', auth, boardController.addMember);

module.exports = router;
