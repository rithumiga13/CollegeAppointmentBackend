const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const TimeSlot = require('../models/TimeSlot');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// ---------------------------------------------------------------------------
// POST /api/appointments
// Student books an appointment for a given time slot.
// ---------------------------------------------------------------------------
const bookAppointment = async (req, res, next) => {
  // Use a session to atomically mark the slot as booked and create the appointment.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { timeSlotId } = req.body;

    // 1. Fetch the slot and lock it within the transaction
    const slot = await TimeSlot.findById(timeSlotId).session(session);
    if (!slot) {
      await session.abortTransaction();
      return sendError(res, 404, 'Time slot not found.');
    }

    if (slot.isBooked) {
      await session.abortTransaction();
      return sendError(
        res,
        409,
        'This time slot has already been booked. Please choose another.'
      );
    }

    // 2. Prevent a student from double-booking the same professor at overlapping times
    const existingForStudent = await Appointment.findOne({
      student: req.user._id,
      status: 'pending',
    })
      .populate('timeSlot')
      .session(session);

    if (existingForStudent) {
      const existingSlot = existingForStudent.timeSlot;
      const overlap =
        existingSlot.professor.toString() === slot.professor.toString() &&
        existingSlot.startTime < slot.endTime &&
        existingSlot.endTime > slot.startTime;

      if (overlap) {
        await session.abortTransaction();
        return sendError(
          res,
          409,
          'You already have a pending appointment with this professor that overlaps with the requested slot.'
        );
      }
    }

    // 3. Create the appointment
    const [appointment] = await Appointment.create(
      [
        {
          student: req.user._id,
          professor: slot.professor,
          timeSlot: slot._id,
          status: 'pending',
        },
      ],
      { session }
    );

    // 4. Mark the slot as booked
    slot.isBooked = true;
    await slot.save({ session });

    await session.commitTransaction();

    // Populate for the response
    const populated = await Appointment.findById(appointment._id)
      .populate('student', 'name email')
      .populate('professor', 'name email department')
      .populate('timeSlot', 'startTime endTime');

    return sendSuccess(res, 201, 'Appointment booked successfully.', {
      appointment: populated,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ---------------------------------------------------------------------------
// GET /api/appointments
// Returns the calling user's appointments.
//   - Students see their own appointments.
//   - Professors see appointments made with them.
// ---------------------------------------------------------------------------
const getMyAppointments = async (req, res, next) => {
  try {
    const filter =
      req.user.role === 'student'
        ? { student: req.user._id }
        : { professor: req.user._id };

    // Optional status filter via query param: ?status=pending
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment.find(filter)
      .populate('student', 'name email')
      .populate('professor', 'name email department')
      .populate('timeSlot', 'startTime endTime')
      .sort({ createdAt: -1 })
      .select('-__v');

    return sendSuccess(res, 200, 'Appointments fetched.', {
      total: appointments.length,
      appointments,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:appointmentId/cancel
// Professor cancels a specific appointment.
// ---------------------------------------------------------------------------
const cancelAppointment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(appointmentId).session(session);

    if (!appointment) {
      await session.abortTransaction();
      return sendError(res, 404, 'Appointment not found.');
    }

    // Only the professor who owns this appointment may cancel it
    if (appointment.professor.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return sendError(
        res,
        403,
        'You are not authorised to cancel this appointment.'
      );
    }

    if (appointment.status === 'cancelled') {
      await session.abortTransaction();
      return sendError(res, 409, 'This appointment has already been cancelled.');
    }

    // 1. Update appointment status
    appointment.status = 'cancelled';
    if (reason) appointment.cancellationReason = reason;
    await appointment.save({ session });

    // 2. Release the time slot so another student can book it
    await TimeSlot.findByIdAndUpdate(
      appointment.timeSlot,
      { isBooked: false },
      { session }
    );

    await session.commitTransaction();

    const populated = await Appointment.findById(appointment._id)
      .populate('student', 'name email')
      .populate('professor', 'name email department')
      .populate('timeSlot', 'startTime endTime');

    return sendSuccess(res, 200, 'Appointment cancelled successfully.', {
      appointment: populated,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ---------------------------------------------------------------------------
// GET /api/appointments/:appointmentId
// Fetch a single appointment (accessible to the student or the professor involved).
// ---------------------------------------------------------------------------
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('student', 'name email')
      .populate('professor', 'name email department')
      .populate('timeSlot', 'startTime endTime')
      .select('-__v');

    if (!appointment) {
      return sendError(res, 404, 'Appointment not found.');
    }

    const isInvolved =
      appointment.student._id.toString() === req.user._id.toString() ||
      appointment.professor._id.toString() === req.user._id.toString();

    if (!isInvolved) {
      return sendError(res, 403, 'You are not authorised to view this appointment.');
    }

    return sendSuccess(res, 200, 'Appointment fetched.', { appointment });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  getAppointmentById,
};
