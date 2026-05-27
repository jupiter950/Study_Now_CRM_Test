const mongoose = require('mongoose');

const transitionLogSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    success: { type: Boolean, required: true, default: true },
    failureReason: { type: String, default: null, trim: true },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

transitionLogSchema.index({ applicationId: 1, timestamp: -1 });

module.exports = mongoose.model('TransitionLog', transitionLogSchema);
