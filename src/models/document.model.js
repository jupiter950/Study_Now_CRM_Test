const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, required: true, default: false },
    uploaded: { type: Boolean, required: true, default: false },
    uploadedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentSchema.index({ applicationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Document', documentSchema);
