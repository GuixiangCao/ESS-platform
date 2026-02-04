const List = require('../models/List');

// Create List
exports.createList = async (req, res) => {
  try {
    const { title, boardId } = req.body;

    const list = new List({
      title,
      board: boardId,
      position: 0
    });

    await list.save();

    res.status(201).json({
      message: 'List created successfully',
      list
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating list', error: error.message });
  }
};

// Get lists by board
exports.getListsByBoard = async (req, res) => {
  try {
    const lists = await List.find({ board: req.params.boardId })
      .sort('position');

    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lists', error: error.message });
  }
};

// Update List
exports.updateList = async (req, res) => {
  try {
    const { title } = req.body;
    let list = await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    if (title) list.title = title;
    list.updatedAt = Date.now();

    await list.save();

    res.json({
      message: 'List updated successfully',
      list
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating list', error: error.message });
  }
};

// Delete List
exports.deleteList = async (req, res) => {
  try {
    const list = await List.findByIdAndRemove(req.params.id);

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting list', error: error.message });
  }
};
