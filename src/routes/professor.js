const express = require('express');
const { body, param } = require('express-validator');
const {
  addSlots,
  getAvailableSlots,
  listProfessors,
} = require('../controllers/professorController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/professors — list all professors (accessible to students too)
router.get('/', listProfessors);

// GET /api/professors/:professorId/slots — view available slots
router.get(
  '/:professorId/slots',
  [param('professorId').isMongoId().withMessage('Invalid professor ID')],
  validate,
  getAvailableSlots
);

// POST /api/professors/slots — professor adds their availability
router.post(
  '/slots',
  restrictTo('professor'),
  [
    body('slots')
      .isArray({ min: 1 })
      .withMessage('slots must be a non-empty array'),
    body('slots.*.startTime')
      .notEmpty()
      .isISO8601()
      .withMessage('Each slot must have a valid ISO 8601 startTime'),
    body('slots.*.endTime')
      .notEmpty()
      .isISO8601()
      .withMessage('Each slot must have a valid ISO 8601 endTime'),
  ],
  validate,
  addSlots
);

module.exports = router;
