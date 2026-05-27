const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    body: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      trim: true,
      enum: ['agent', 'counsellor', 'qa_officer', 'admission_officer', 'visa_officer', 'enrolment_officer'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('Note', noteSchema);
