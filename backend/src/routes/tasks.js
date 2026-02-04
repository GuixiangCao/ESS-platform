const express = require('express');
const taskController = require('../controllers/taskController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create task
router.post('/', auth, taskController.createTask);

// Get tasks by list
router.get('/list/:listId', auth, taskController.getTasksByList);

// Update task
router.put('/:id', auth, taskController.updateTask);

// Delete task
router.delete('/:id', auth, taskController.deleteTask);

// Move task
router.patch('/:id/move', auth, taskController.moveTask);

module.exports = router;
