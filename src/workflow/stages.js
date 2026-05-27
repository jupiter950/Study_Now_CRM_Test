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

const STAGE_LABELS = Object.freeze({
  [STAGES.NEW_APP]: 'New App',
  [STAGES.QA_REVIEW]: 'QA Review',
  [STAGES.APP_REVIEW]: 'App Review',
  [STAGES.DECISION]: 'Decision',
  [STAGES.DEPOSIT]: 'Deposit',
  [STAGES.CAS_REVIEW]: 'CAS Review',
  [STAGES.ENROLMENT]: 'Enrolment',
  [TERMINAL_STAGES.APP_REJECTED]: 'App Rejected',
  [TERMINAL_STAGES.CLOSED_LOST]: 'Closed Lost',
});

function getStageLabel(stage) {
  return STAGE_LABELS[stage] || stage;
}

module.exports = {
  STAGES,
  PIPELINE,
  TERMINAL_STAGES,
  ALL_STAGES,
  STAGE_LABELS,
  getStageLabel,
};
