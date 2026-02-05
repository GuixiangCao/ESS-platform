const express = require('express');
const router = express.Router();
const UnplannedOutageReason = require('../models/UnplannedOutageReason');
const { auth } = require('../middleware/auth');

// 获取某天的停机原因
router.get('/station/:stationId/date/:date', auth, async (req, res) => {
  try {
    const { stationId, date } = req.params;

    const reason = await UnplannedOutageReason.findOne({
      stationId: parseInt(stationId),
      date: new Date(date)
    })
    .populate('updatedBy', 'username email')
    .populate('history.updatedBy', 'username email');

    res.json({
      success: true,
      data: reason
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取停机原因失败',
      error: error.message
    });
  }
});

// 批量获取停机原因（用于详情模态框）
router.post('/station/:stationId/batch', auth, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { dates } = req.body;  // 日期数组

    if (!Array.isArray(dates)) {
      return res.status(400).json({
        success: false,
        message: 'dates参数必须是数组'
      });
    }

    const reasons = await UnplannedOutageReason.find({
      stationId: parseInt(stationId),
      date: { $in: dates.map(d => new Date(d)) }
    })
    .populate('updatedBy', 'username email')
    .select('-history');  // 不返回历史记录，减少数据量

    // 转换为Map便于前端使用
    const reasonMap = {};
    reasons.forEach(r => {
      const dateKey = r.date.toISOString().split('T')[0];
      reasonMap[dateKey] = {
        _id: r._id,
        reasonType: r.reasonType,
        reasonNote: r.reasonNote,
        updatedBy: r.updatedBy,
        updatedAt: r.updatedAt
      };
    });

    res.json({
      success: true,
      data: reasonMap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批量获取停机原因失败',
      error: error.message
    });
  }
});

// 保存/更新停机原因
router.put('/station/:stationId/date/:date', auth, async (req, res) => {
  try {
    const { stationId, date } = req.params;
    const { reasonType, reasonNote } = req.body;

    if (!reasonType) {
      return res.status(400).json({
        success: false,
        message: '停机原因类型不能为空'
      });
    }

    const dateObj = new Date(date);
    const existingReason = await UnplannedOutageReason.findOne({
      stationId: parseInt(stationId),
      date: dateObj
    });

    if (existingReason) {
      // 更新现有记录，保存历史
      existingReason.history.push({
        reasonType: existingReason.reasonType,
        reasonNote: existingReason.reasonNote,
        updatedBy: existingReason.updatedBy,
        updatedAt: existingReason.updatedAt
      });

      existingReason.reasonType = reasonType;
      existingReason.reasonNote = reasonNote || '';
      existingReason.updatedBy = req.user.userId;

      await existingReason.save();
      await existingReason.populate('updatedBy', 'username email');

      res.json({
        success: true,
        message: '停机原因已更新',
        data: existingReason
      });
    } else {
      // 创建新记录
      const newReason = new UnplannedOutageReason({
        stationId: parseInt(stationId),
        date: dateObj,
        reasonType,
        reasonNote: reasonNote || '',
        updatedBy: req.user.userId
      });

      await newReason.save();
      await newReason.populate('updatedBy', 'username email');

      res.json({
        success: true,
        message: '停机原因已保存',
        data: newReason
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存停机原因失败',
      error: error.message
    });
  }
});

// 获取历史记录
router.get('/:reasonId/history', auth, async (req, res) => {
  try {
    const reason = await UnplannedOutageReason.findById(req.params.reasonId)
      .populate('history.updatedBy', 'username email')
      .select('history date stationId');

    if (!reason) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    res.json({
      success: true,
      data: {
        date: reason.date,
        stationId: reason.stationId,
        history: reason.history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取历史记录失败',
      error: error.message
    });
  }
});

module.exports = router;
