const express = require('express');
const mongoose = require('mongoose');
const models = require('../models');

const router = express.Router();

/**
 * @route   GET /api/test/db
 * @desc    Kiểm tra trạng thái kết nối tới MongoDB Atlas và ping database
 */
router.get('/db', async (req, res) => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const state = mongoose.connection.readyState;
  const statusName = readyStates[state] || 'unknown';

  if (state !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Chưa kết nối thành công tới MongoDB Atlas',
      readyState: state,
      status: statusName
    });
  }

  try {
    const adminDb = mongoose.connection.db.admin();
    const pingResult = await adminDb.ping();
    const collections = await mongoose.connection.db.listCollections().toArray();

    return res.status(200).json({
      success: true,
      message: 'Kết nối MongoDB Atlas thành công!',
      connection: {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        databaseName: mongoose.connection.name,
        readyState: state,
        status: statusName
      },
      ping: pingResult,
      existingCollectionsInDb: collections.map((c) => c.name),
      registeredModelsCount: Object.keys(models).length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra kết nối Atlas',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test/collections-count
 * @desc    Đếm số lượng bản ghi trên tất cả registered model collections
 */
router.get('/collections-count', async (req, res) => {
  try {
    const counts = {};
    for (const [modelName, Model] of Object.entries(models)) {
      counts[modelName] = {
        collection: Model.collection.name,
        count: await Model.countDocuments()
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy số lượng document thành công',
      data: counts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi truy vấn collections',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/test/write
 * @desc    Test quyền ghi dữ liệu (tạo và xóa thử 1 document mẫu vào collection audit_logs)
 */
router.post('/write', async (req, res) => {
  try {
    const AuditLog = models.AuditLog;
    const testLog = await AuditLog.create({
      action: 'ATLAS_CONNECTION_TEST',
      table_name: 'test',
      record_id: new mongoose.Types.ObjectId(),
      old_data: null,
      new_data: { test: true, timestamp: new Date() }
    });

    // Xóa ngay bản ghi test để không làm rác database
    await AuditLog.findByIdAndDelete(testLog._id);

    return res.status(200).json({
      success: true,
      message: 'Kiểm tra quyền ghi (Write) lên MongoDB Atlas thành công!',
      testDocumentId: testLog._id
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể ghi dữ liệu vào Atlas',
      error: error.message
    });
  }
});

module.exports = router;
