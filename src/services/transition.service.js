const { Application, TransitionLog } = require('../models');
const { getAvailableTransitions, isKnownStage, isValidTransition } = require('../workflow/stateMachine');
const { getStageLabel } = require('../workflow/stages');
const { evaluateRules } = require('../workflow/rules');

function makeError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function normalizeRole(role) {
  return typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : 'unspecified';
}

async function writeTransitionLog({ applicationId, from, to, role, success, failureReason = null }) {
  await TransitionLog.create({
    applicationId,
    from,
    to,
    role: normalizeRole(role),
    success,
    failureReason,
  });
}

function formatTransition(transition, blockedReason = null) {
  return {
    to: transition.to,
    label: getStageLabel(transition.to),
    blockedReason,
  };
}

async function getAvailableApplicationTransitions(applicationId, role) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  const transitions = getAvailableTransitions(application, normalizeRole(role));
  const formatted = [];

  for (const transition of transitions) {
    let blockedReason = null;
    const ruleCheck = await evaluateRules(transition.rules, application, {
      from: application.currentStage,
      to: transition.to,
      role: normalizeRole(role),
    });

    if (!ruleCheck.passed) {
      blockedReason = ruleCheck.failedRule?.blockedReason || 'Transition blocked by business rule.';
    }

    formatted.push(formatTransition(transition, blockedReason));
  }

  return formatted;
}

async function transitionApplication(applicationId, to, role) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  if (typeof to !== 'string' || !to.trim()) {
    throw makeError(400, 'VALIDATION_ERROR', 'Transition target `to` is required');
  }

  const targetStage = to.trim();
  const fromStage = application.currentStage;

  if (!isKnownStage(targetStage)) {
    const reason = `Unknown transition target: ${targetStage}`;
    await writeTransitionLog({
      applicationId: application._id,
      from: fromStage,
      to: targetStage,
      role,
      success: false,
      failureReason: reason,
    });
    throw makeError(422, 'INVALID_TRANSITION_TARGET', reason);
  }

  if (!isValidTransition(fromStage, targetStage)) {
    const reason = `Cannot transition from ${getStageLabel(fromStage)} to ${getStageLabel(targetStage)}`;
    await writeTransitionLog({
      applicationId: application._id,
      from: fromStage,
      to: targetStage,
      role,
      success: false,
      failureReason: reason,
    });
    throw makeError(422, 'INVALID_STAGE_TRANSITION', reason, { from: fromStage, to: targetStage });
  }

  const availableTransition = getAvailableTransitions(application, normalizeRole(role)).find(
    (transition) => transition.to === targetStage
  );

  if (!availableTransition || !availableTransition.allowed) {
    const reason = `Transition to ${getStageLabel(targetStage)} is not available for this role`;
    await writeTransitionLog({
      applicationId: application._id,
      from: fromStage,
      to: targetStage,
      role,
      success: false,
      failureReason: reason,
    });
    throw makeError(403, 'TRANSITION_FORBIDDEN', reason, { from: fromStage, to: targetStage });
  }

  const ruleCheck = await evaluateRules(availableTransition.rules, application, {
    from: fromStage,
    to: targetStage,
    role: normalizeRole(role),
  });

  if (!ruleCheck.passed) {
    const reason = ruleCheck.failedRule?.blockedReason || 'Transition blocked by business rule.';
    await writeTransitionLog({
      applicationId: application._id,
      from: fromStage,
      to: targetStage,
      role,
      success: false,
      failureReason: `${ruleCheck.failedRule?.ruleId || 'unknownRule'}: ${reason}`,
    });
    throw makeError(422, 'TRANSITION_RULE_FAILED', reason, {
      ruleId: ruleCheck.failedRule?.ruleId || null,
      from: fromStage,
      to: targetStage,
    });
  }

  application.currentStage = targetStage;
  await application.save();

  await writeTransitionLog({
    applicationId: application._id,
    from: fromStage,
    to: targetStage,
    role,
    success: true,
  });

  return application;
}

module.exports = {
  getAvailableApplicationTransitions,
  transitionApplication,
};
