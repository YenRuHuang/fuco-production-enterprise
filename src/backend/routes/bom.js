/**
 * FUCO Production System - BOM 路由 (佔位符)
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BOM 路由 - 待實現',
    data: []
  });
});

module.exports = router;