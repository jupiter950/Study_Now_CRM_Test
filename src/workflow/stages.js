const STAGES = Object.freeze({
  NEW_APP: 'new_app',
  QA_REVIEW: 'qa_review',
  APP_REVIEW: 'app_review',
  DECISION: 'decision',
  DEPOSIT: 'deposit',
  CAS_REVIEW: 'cas_review',
  ENROLMENT: 'enrolment',
});

const PIPELINE = Object.freeze([
  STAGES.NEW_APP,
  STAGES.QA_REVIEW,
  STAGES.APP_REVIEW,
  STAGES.DECISION,
  STAGES.DEPOSIT,
  STAGES.CAS_REVIEW,
  STAGES.ENROLMENT,
]);

const TERMINAL_STAGES = Object.freeze({
  APP_REJECTED: 'app_rejected',
  CLOSED_LOST: 'closed_lost',
});

const ALL_STAGES = Object.freeze([...PIPELINE, ...Object.values(TERMINAL_STAGES)]);

module.exports = {
  STAGES,
  PIPELINE,
  TERMINAL_STAGES,
  ALL_STAGES,
};
