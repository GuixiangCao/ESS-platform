const Task = require('../models/Task');
const List = require('../models/List');

// Create Task
exports.createTask = async (req, res) => {
  try {
    const { title, description, listId, boardId, priority, dueDate } = req.body;

    const task = new Task({
      title,
      description,
      list: listId,
      board: boardId,
      priority,
      dueDate,
      assignee: req.user.userId
    });

    await task.save();
    await task.populate('assignee', 'username email avatar');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

// Get tasks by list
exports.getTasksByList = async (req, res) => {
  try {
    const tasks = await Task.find({ list: req.params.listId })
      .populate('assignee', 'username email avatar')
      .sort('position');

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Update Task
exports.updateTask = async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, assignee } = req.body;
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (dueDate) task.dueDate = dueDate;
    if (assignee) task.assignee = assignee;
    task.updatedAt = Date.now();

    await task.save();
    await task.populate('assignee', 'username email avatar');

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// Delete Task
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndRemove(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Move task to different list
exports.moveTask = async (req, res) => {
  try {
    const { newListId, position } = req.body;
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.list = newListId;
    task.position = position || 0;
    await task.save();
    await task.populate('assignee', 'username email avatar');

    res.json({
      message: 'Task moved successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ message: 'Error moving task', error: error.message });
  }
};
