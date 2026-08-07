const Joi = require('joi');

const chatbotValidator = {
  sendMessageSchema: Joi.object({
    message: Joi.string().trim().min(1).max(2000).required()
      .messages({ 'any.required': 'Message is required', 'string.max': 'Message cannot exceed 2000 characters' }),
    conversationHistory: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().required(),
      })
    ).max(20).optional().default([]),
  }),
};

module.exports = chatbotValidator;
