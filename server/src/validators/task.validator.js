const Joi = require('joi');
const { objectId } = require('./common.validator');

const taskValidator = {
  createTaskSchema: Joi.object({
    title: Joi.string().trim().min(1).max(200).required().messages({
      'any.required': 'Task title is required',
      'string.min': 'Task title cannot be empty',
      'string.max': 'Task title cannot exceed 200 characters',
    }),
    description: Joi.string().trim().max(2000).optional().allow('', null),
    deadline: Joi.date().iso().optional().allow('', null),
    assignedStudents: Joi.array().items(objectId).optional().default([]),
  }),

  updateTaskStatusSchema: Joi.object({
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').required().messages({
      'any.required': 'Task status is required',
      'any.only': 'Status must be one of [pending, in_progress, completed, cancelled]',
    }),
  }),
};

module.exports = taskValidator;
