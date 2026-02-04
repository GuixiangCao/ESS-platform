const Board = require('../models/Board');
const Task = require('../models/Task');
const List = require('../models/List');

// Create Board
exports.createBoard = async (req, res) => {
  try {
    const { title, description, backgroundColor, isPublic } = req.body;

    const board = new Board({
      title,
      description,
      backgroundColor,
      isPublic,
      owner: req.user.userId,
      members: [req.user.userId]
    });

    await board.save();
    await board.populate('owner members', 'username email avatar');

    res.status(201).json({
      message: 'Board created successfully',
      board
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating board', error: error.message });
  }
};

// Get all boards for user
exports.getUserBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    }).populate('owner members', 'username email avatar');

    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching boards', error: error.message });
  }
};

// Get board by ID
exports.getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner members', 'username email avatar');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check access
    if (!board.isPublic && !board.members.some(m => m._id.toString() === req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching board', error: error.message });
  }
};

// Update Board
exports.updateBoard = async (req, res) => {
  try {
    let board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this board' });
    }

    const { title, description, backgroundColor, isPublic } = req.body;
    if (title) board.title = title;
    if (description !== undefined) board.description = description;
    if (backgroundColor) board.backgroundColor = backgroundColor;
    if (isPublic !== undefined) board.isPublic = isPublic;
    board.updatedAt = Date.now();

    await board.save();
    await board.populate('owner members', 'username email avatar');

    res.json({
      message: 'Board updated successfully',
      board
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating board', error: error.message });
  }
};

// Delete Board
exports.deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this board' });
    }

    // Delete all tasks and lists in this board
    await List.deleteMany({ board: req.params.id });
    await Task.deleteMany({ board: req.params.id });
    await Board.findByIdAndDelete(req.params.id);

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting board', error: error.message });
  }
};

// Add member to board
exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!board.members.includes(userId)) {
      board.members.push(userId);
      await board.save();
    }

    await board.populate('owner members', 'username email avatar');
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
};
