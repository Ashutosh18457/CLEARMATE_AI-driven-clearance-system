const express = require('express');
const chatbotController = require('../controllers/chatbot.controller');
const validate = require('../middleware/validate');
const v = require('../validators/chatbot.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Only students can use the chatbot
router.post(
  '/message',
  protect,
  restrictTo('student'),
  validate(v.sendMessageSchema),
  chatbotController.sendMessage
);

module.exports = router;
