const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// ---------------------------------------------------------------------------
// POST /api/professors/slots
// Professor adds one or more availability time slots.
// ---------------------------------------------------------------------------
const addSlots = async (req, res, next) => {
  try {
    const { slots } = req.body;
    // `slots` is an array of { startTime, endTime }

    const slotsToCreate = slots.map((slot) => ({
      professor: req.user._id,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    }));

    // Basic business rule: no slot should overlap with an existing open slot
    for (const s of slotsToCreate) {
      if (s.endTime <= s.startTime) {
        return sendError(
          res,
          422,
          `End time must be after start time for slot starting at ${s.startTime}.`
        );
      }

      const overlap = await TimeSlot.findOne({
        professor: req.user._id,
        isBooked: false,
        $or: [
          { startTime: { $lt: s.endTime }, endTime: { $gt: s.startTime } },
        ],
      });

      if (overlap) {
        return sendError(
          res,
          409,
          `A slot from ${overlap.startTime.toISOString()} to ${overlap.endTime.toISOString()} already overlaps with one of your new slots.`
        );
      }
    }

    const created = await TimeSlot.insertMany(slotsToCreate);

    return sendSuccess(res, 201, `${created.length} slot(s) added successfully.`, {
      slots: created,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/professors/:professorId/slots
// Students (or anyone authenticated) can view available slots for a professor.
// ---------------------------------------------------------------------------
const getAvailableSlots = async (req, res, next) => {
  try {
    const { professorId } = req.params;

    const professor = await User.findOne({ _id: professorId, role: 'professor' });
    if (!professor) {
      return sendError(res, 404, 'Professor not found.');
    }

    const slots = await TimeSlot.find({
      professor: professorId,
      isBooked: false,
      startTime: { $gte: new Date() }, // Only future slots
    })
      .sort({ startTime: 1 })
      .select('-__v');

    return sendSuccess(res, 200, 'Available slots fetched.', {
      professor: {
        id: professor._id,
        name: professor.name,
        department: professor.department,
      },
      totalAvailable: slots.length,
      slots,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/professors
// List all professors (convenience endpoint for students to discover professors).
// ---------------------------------------------------------------------------
const listProfessors = async (req, res, next) => {
  try {
    const professors = await User.find({ role: 'professor' }).select(
      'name email department createdAt'
    );

    return sendSuccess(res, 200, 'Professors fetched.', {
      total: professors.length,
      professors,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { addSlots, getAvailableSlots, listProfessors };
