const express = require('express');
const listController = require('../controllers/listController');
const auth = require('../middleware/auth');

const router = express.Router();

// Create list
router.post('/', auth, listController.createList);

// Get lists by board
router.get('/board/:boardId', auth, listController.getListsByBoard);

// Update list
router.put('/:id', auth, listController.updateList);

// Delete list
router.delete('/:id', auth, listController.deleteList);

module.exports = router;
