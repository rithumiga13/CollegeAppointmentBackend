const express = require('express');
const { body, param, query } = require('express-validator');
const {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  getAppointmentById,
} = require('../controllers/appointmentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All appointment routes require authentication
router.use(protect);

// POST /api/appointments — student books an appointment
router.post(
  '/',
  restrictTo('student'),
  [body('timeSlotId').isMongoId().withMessage('timeSlotId must be a valid MongoDB ID')],
  validate,
  bookAppointment
);

// GET /api/appointments — get my appointments (student or professor)
router.get(
  '/',
  [
    query('status')
      .optional()
      .isIn(['pending', 'cancelled', 'completed'])
      .withMessage('status must be one of: pending, cancelled, completed'),
  ],
  validate,
  getMyAppointments
);

// GET /api/appointments/:appointmentId — get single appointment
router.get(
  '/:appointmentId',
  [param('appointmentId').isMongoId().withMessage('Invalid appointment ID')],
  validate,
  getAppointmentById
);

// PATCH /api/appointments/:appointmentId/cancel — professor cancels
router.patch(
  '/:appointmentId/cancel',
  restrictTo('professor'),
  [
    param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
    body('reason').optional().trim(),
  ],
  validate,
  cancelAppointment
);

module.exports = router;
