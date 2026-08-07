const chatbotService = require('../services/chatbot.service');
const { sendSuccess } = require('../utils/response');

const chatbotController = {
  /** @route POST /api/chatbot/message */
  async sendMessage(req, res, next) {
    try {
      const { message, conversationHistory } = req.body;
      const result = await chatbotService.processMessage(req.user.id, message, conversationHistory);
      sendSuccess(res, { data: result, message: 'Response generated' });
    } catch (error) { next(error); }
  },
};

module.exports = chatbotController;
