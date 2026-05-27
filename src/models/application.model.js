const mongoose = require('mongoose');

const officerAssignmentSchema = new mongoose.Schema(
  {
    counsellor: { type: String, default: null, trim: true },
    qaOfficer: { type: String, default: null, trim: true },
    admissionOfficer: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    university: { type: String, required: true, trim: true },
    currentStage: { type: String, required: true, default: 'new_app', trim: true },
    status: {
      type: String,
      required: true,
      default: 'active',
      enum: ['active', 'deferred', 'closed', 'withdrawn', 'cancelled', 'closed_lost'],
    },
    agentId: { type: String, trim: true, default: null },
    deferredIntake: { type: String, trim: true, default: null },
    assignedOfficers: { type: officerAssignmentSchema, default: () => ({}) },
  },
  { timestamps: true }
);

applicationSchema.index({ agentId: 1 });
applicationSchema.index({ currentStage: 1 });

module.exports = mongoose.model('Application', applicationSchema);
