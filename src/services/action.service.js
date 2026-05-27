const { Application, Document, Note } = require('../models');
const {
  ACTION_IDS,
  getActionById,
  evaluateActionAvailability,
  getAvailableActionsForApplication,
} = require('../workflow/actions');
const { STAGES, TERMINAL_STAGES } = require('../workflow/stages');

function makeError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function normalizeRole(role) {
  return typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : '';
}

async function getAvailableApplicationActions(applicationId, role) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  return getAvailableActionsForApplication(application, normalizeRole(role));
}

async function executeApplicationAction(applicationId, actionId, role, payload = {}) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  const normalizedRole = normalizeRole(role);
  const action = getActionById(actionId);

  if (!action) {
    throw makeError(422, 'INVALID_ACTION', `Unknown action: ${actionId}`);
  }

  const availability = evaluateActionAvailability(action, application, normalizedRole);
  if (!availability.available) {
    const status = !action.allowedRoles.includes(normalizedRole) ? 403 : 422;
    const code = status === 403 ? 'ACTION_FORBIDDEN' : 'ACTION_UNAVAILABLE';
    throw makeError(status, code, availability.blockedReason, { action: actionId });
  }

  switch (action.id) {
    case ACTION_IDS.ADD_NOTE: {
      const body = payload?.body;
      if (typeof body !== 'string' || !body.trim()) {
        throw makeError(400, 'VALIDATION_ERROR', 'Note body is required in payload.body');
      }
      await Note.create({
        applicationId: application._id,
        body: body.trim(),
        role: normalizedRole,
      });
      break;
    }

    case ACTION_IDS.ADD_ATTACHMENT: {
      const name = payload?.name;
      if (typeof name !== 'string' || !name.trim()) {
        throw makeError(400, 'VALIDATION_ERROR', 'Document name is required in payload.name');
      }
      await Document.findOneAndUpdate(
        { applicationId: application._id, name: name.trim() },
        {
          $set: {
            uploaded: true,
            uploadedAt: new Date(),
            required: true,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      break;
    }

    case ACTION_IDS.DEFER: {
      const deferredIntake = payload?.deferredIntake;
      if (typeof deferredIntake !== 'string' || !deferredIntake.trim()) {
        throw makeError(400, 'VALIDATION_ERROR', 'payload.deferredIntake is required for defer');
      }
      application.status = 'deferred';
      application.deferredIntake = deferredIntake.trim();
      break;
    }

    case ACTION_IDS.WITHDRAW:
      application.status = 'withdrawn';
      break;

    case ACTION_IDS.CANCEL:
      application.status = 'cancelled';
      break;

    case ACTION_IDS.CHANGE_COURSE: {
      if (payload?.course && typeof payload.course === 'string') {
        application.course = payload.course.trim();
      }
      if (payload?.university && typeof payload.university === 'string') {
        application.university = payload.university.trim();
      }
      application.status = 'active';
      application.currentStage = STAGES.QA_REVIEW;
      break;
    }

    case ACTION_IDS.REFUND:
      application.status = 'closed';
      break;

    case ACTION_IDS.DROP_OUT:
      application.status = 'withdrawn';
      break;

    case ACTION_IDS.APP_REJECTED:
      application.currentStage = TERMINAL_STAGES.APP_REJECTED;
      application.status = 'closed';
      break;

    case ACTION_IDS.CLOSED_LOST:
      application.currentStage = TERMINAL_STAGES.CLOSED_LOST;
      application.status = 'closed_lost';
      break;

    default:
      throw makeError(422, 'INVALID_ACTION', `Action not implemented: ${actionId}`);
  }

  await application.save();
  return application;
}

module.exports = {
  getAvailableApplicationActions,
  executeApplicationAction,
};
