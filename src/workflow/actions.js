const { STAGES, PIPELINE, TERMINAL_STAGES } = require('./stages');

const INTERNAL_ROLES = ['counsellor', 'qa_officer', 'admission_officer'];

const ACTION_IDS = Object.freeze({
  ADD_NOTE: 'add_note',
  ADD_ATTACHMENT: 'add_attachment',
  DEFER: 'defer',
  WITHDRAW: 'withdraw',
  CANCEL: 'cancel',
  CHANGE_COURSE: 'change_course',
  REFUND: 'refund',
  DROP_OUT: 'drop_out',
  APP_REJECTED: 'app_rejected',
  CLOSED_LOST: 'closed_lost',
});

function stageIndex(stage) {
  return PIPELINE.indexOf(stage);
}

function isTerminalStage(stage) {
  return stage === TERMINAL_STAGES.APP_REJECTED || stage === TERMINAL_STAGES.CLOSED_LOST;
}

function isPastOrAtStage(currentStage, targetStage) {
  const currentIdx = stageIndex(currentStage);
  const targetIdx = stageIndex(targetStage);
  if (currentIdx === -1 || targetIdx === -1) return false;
  return currentIdx >= targetIdx;
}

function isBeforeStage(currentStage, targetStage) {
  const currentIdx = stageIndex(currentStage);
  const targetIdx = stageIndex(targetStage);
  if (currentIdx === -1 || targetIdx === -1) return false;
  return currentIdx < targetIdx;
}

/**
 * Config-driven contextual actions (separate from stage transitions).
 */
const ACTIONS = Object.freeze([
  {
    id: ACTION_IDS.ADD_NOTE,
    label: 'Add Note',
    allowedRoles: ['agent', ...INTERNAL_ROLES],
    isAvailable(application) {
      return !isTerminalStage(application.currentStage);
    },
    unavailableReason: 'Notes cannot be added on closed applications.',
  },
  {
    id: ACTION_IDS.ADD_ATTACHMENT,
    label: 'Add Attachment',
    allowedRoles: ['agent', ...INTERNAL_ROLES],
    isAvailable(application) {
      return !isTerminalStage(application.currentStage);
    },
    unavailableReason: 'Documents cannot be uploaded on closed applications.',
  },
  {
    id: ACTION_IDS.DEFER,
    label: 'Defer',
    allowedRoles: INTERNAL_ROLES,
    isAvailable(application) {
      if (isTerminalStage(application.currentStage)) return false;
      if (application.status === 'deferred') return false;
      return ['qa_review', 'app_review', 'decision', 'deposit'].includes(application.currentStage);
    },
    unavailableReason: 'Defer is only available during mid-pipeline review stages.',
  },
  {
    id: ACTION_IDS.WITHDRAW,
    label: 'Withdraw',
    allowedRoles: INTERNAL_ROLES,
    isAvailable(application) {
      if (isTerminalStage(application.currentStage)) return false;
      return isBeforeStage(application.currentStage, STAGES.ENROLMENT);
    },
    unavailableReason: 'Withdraw is only available before Enrolment.',
  },
  {
    id: ACTION_IDS.CANCEL,
    label: 'Cancel',
    allowedRoles: INTERNAL_ROLES,
    isAvailable(application) {
      if (isTerminalStage(application.currentStage)) return false;
      return ['new_app', 'qa_review', 'app_review', 'decision'].includes(application.currentStage);
    },
    unavailableReason: 'Cancel is only available in early or mid pipeline stages.',
  },
  {
    id: ACTION_IDS.CHANGE_COURSE,
    label: 'Change Course',
    allowedRoles: INTERNAL_ROLES,
    isAvailable(application) {
      if (isTerminalStage(application.currentStage)) return false;
      return application.currentStage === STAGES.QA_REVIEW || application.currentStage === STAGES.APP_REVIEW;
    },
    unavailableReason: 'Change Course is only available during QA Review or App Review.',
  },
  {
    id: ACTION_IDS.REFUND,
    label: 'Refund',
    allowedRoles: ['admission_officer'],
    isAvailable(application) {
      if (isTerminalStage(application.currentStage)) return false;
      return isPastOrAtStage(application.currentStage, STAGES.DEPOSIT);
    },
    unavailableReason: 'Refund is only available after the Deposit stage.',
  },
  {
    id: ACTION_IDS.DROP_OUT,
    label: 'Drop Out',
    allowedRoles: ['admission_officer'],
    isAvailable(application) {
      return application.currentStage === STAGES.ENROLMENT;
    },
    unavailableReason: 'Drop Out is only available after Enrolment.',
  },
  {
    id: ACTION_IDS.APP_REJECTED,
    label: 'App Rejected',
    allowedRoles: ['qa_officer', 'admission_officer'],
    isAvailable(application, role) {
      if (application.currentStage === STAGES.QA_REVIEW) {
        return role === 'qa_officer';
      }
      if (application.currentStage === STAGES.APP_REVIEW) {
        return role === 'admission_officer';
      }
      return false;
    },
    unavailableReason: 'App Rejected is only available from QA Review or App Review.',
  },
  {
    id: ACTION_IDS.CLOSED_LOST,
    label: 'Closed Lost',
    allowedRoles: INTERNAL_ROLES,
    isAvailable(application) {
      if (isTerminalStage(application.currentStage)) return false;
      return application.currentStage !== STAGES.ENROLMENT;
    },
    unavailableReason: 'Closed Lost is not available at Enrolment (use Drop Out instead).',
  },
]);

function getActionById(actionId) {
  return ACTIONS.find((action) => action.id === actionId) || null;
}

function evaluateActionAvailability(action, application, role) {
  if (!action.allowedRoles.includes(role)) {
    return {
      available: false,
      blockedReason: `Role ${role} cannot perform ${action.label}.`,
    };
  }

  if (!action.isAvailable(application, role)) {
    return {
      available: false,
      blockedReason: action.unavailableReason || `${action.label} is not available at this stage.`,
    };
  }

  return { available: true, blockedReason: null };
}

function getAvailableActionsForApplication(application, role) {
  return ACTIONS.map((action) => {
    const evaluation = evaluateActionAvailability(action, application, role);
    return {
      action: action.id,
      label: action.label,
      blockedReason: evaluation.blockedReason,
    };
  });
}

module.exports = {
  ACTION_IDS,
  ACTIONS,
  getActionById,
  evaluateActionAvailability,
  getAvailableActionsForApplication,
};
