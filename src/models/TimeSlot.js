const mongoose = require('mongoose');

/**
 * A TimeSlot represents a single availability window that a professor has opened
 * for student appointments. Once a student books against it, `isBooked` flips to
 * true and the slot is no longer visible as available.
 */
const timeSlotSchema = new mongoose.Schema(
  {
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Professor reference is required'],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce: endTime must be after startTime
timeSlotSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

// Compound index to quickly fetch all open slots for a professor
timeSlotSchema.index({ professor: 1, isBooked: 1, startTime: 1 });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
