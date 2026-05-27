const { STAGES, TERMINAL_STAGES } = require('./stages');

/**
 * Transition config.
 *
 * This commit intentionally keeps `allowedRoles` and `rules` mostly empty/stubbed.
 * Commit 6 and 7 will enforce rules and role permissions.
 */
const TRANSITIONS = Object.freeze([
  // Main pipeline (forward-only, no skipping)
  { from: STAGES.NEW_APP, to: STAGES.QA_REVIEW, allowedRoles: [], rules: [] },
  {
    from: STAGES.QA_REVIEW,
    to: STAGES.APP_REVIEW,
    allowedRoles: [],
    rules: ['allRequiredDocumentsUploaded'],
  },
  {
    from: STAGES.APP_REVIEW,
    to: STAGES.DECISION,
    allowedRoles: [],
    rules: ['admissionReviewNoteRecorded'],
  },
  { from: STAGES.DECISION, to: STAGES.DEPOSIT, allowedRoles: [], rules: [] },
  { from: STAGES.DEPOSIT, to: STAGES.CAS_REVIEW, allowedRoles: [], rules: [] },
  { from: STAGES.CAS_REVIEW, to: STAGES.ENROLMENT, allowedRoles: [], rules: [] },

  // Branch / terminal transitions
  // App Rejected can only be reached from QA Review or App Review
  { from: STAGES.QA_REVIEW, to: TERMINAL_STAGES.APP_REJECTED, allowedRoles: [], rules: [] },
  { from: STAGES.APP_REVIEW, to: TERMINAL_STAGES.APP_REJECTED, allowedRoles: [], rules: [] },
]);

module.exports = {
  TRANSITIONS,
};
