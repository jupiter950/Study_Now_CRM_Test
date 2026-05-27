const { ALL_STAGES, PIPELINE, TERMINAL_STAGES } = require('./stages');
const { TRANSITIONS } = require('./transitions');

function isKnownStage(stage) {
  return typeof stage === 'string' && ALL_STAGES.includes(stage);
}

function getNextStage(currentStage) {
  if (!isKnownStage(currentStage)) return null;
  const idx = PIPELINE.indexOf(currentStage);
  if (idx === -1) return null;
  return PIPELINE[idx + 1] || null;
}

function isTerminalStage(stage) {
  return stage === TERMINAL_STAGES.APP_REJECTED || stage === TERMINAL_STAGES.CLOSED_LOST;
}

function isValidTransition(from, to) {
  if (!isKnownStage(from) || !isKnownStage(to)) return false;
  if (isTerminalStage(from)) return false;
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/**
 * Returns possible transitions from the application's current stage.
 * Role and rule checks are intentionally stubbed for this commit; later commits
 * will filter/annotate using allowedRoles and rules.
 */
function getAvailableTransitions(application, role) {
  const from = application?.currentStage;
  if (!isKnownStage(from)) return [];
  if (isTerminalStage(from)) return [];

  // stub role filtering: if allowedRoles is empty, treat as allowed for now
  return TRANSITIONS.filter((t) => t.from === from).map((t) => ({
    to: t.to,
    allowed: t.allowedRoles.length === 0 || (role ? t.allowedRoles.includes(role) : true),
    rules: t.rules,
  }));
}

module.exports = {
  isKnownStage,
  isTerminalStage,
  getNextStage,
  isValidTransition,
  getAvailableTransitions,
};
