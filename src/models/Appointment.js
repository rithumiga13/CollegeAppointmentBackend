const mongoose = require('mongoose');

/**
 * Appointment ties a student, a professor, and a specific TimeSlot together.
 * Status lifecycle: pending → cancelled (by professor) | completed
 */
const appointmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Professor reference is required'],
      index: true,
    },
    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: [true, 'TimeSlot reference is required'],
      unique: true, // One appointment per slot — enforced at DB level
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'cancelled', 'completed'],
        message: 'Status must be pending, cancelled, or completed',
      },
      default: 'pending',
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
