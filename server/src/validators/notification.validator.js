const Joi = require('joi');

const notificationValidator = {
  notificationQuerySchema: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    unreadOnly: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false', '')).optional(),
  }),
};

module.exports = notificationValidator;
