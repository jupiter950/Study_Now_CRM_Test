const mongoose = require('mongoose');

const aiAssessmentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    stage: { type: String, required: true, trim: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    advisory: { type: Boolean, required: true, default: true },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiAssessmentSchema.index({ applicationId: 1, stage: 1, createdAt: -1 });

module.exports = mongoose.model('AiAssessment', aiAssessmentSchema);
