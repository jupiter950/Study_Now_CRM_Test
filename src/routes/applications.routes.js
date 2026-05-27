const express = require('express');
const mongoose = require('mongoose');
const { Application, Document, Note } = require('../models');
const { requireRole } = require('../middleware/require-role');
const {
  getAvailableApplicationTransitions,
  transitionApplication,
} = require('../services/transition.service');
const {
  getAvailableApplicationActions,
  executeApplicationAction,
} = require('../services/action.service');

const router = express.Router();

const DEFAULT_REQUIRED_DOCUMENTS = ['passport', 'transcript', 'english_test', 'financial_evidence'];

function makeError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function validateCreateBody(body) {
  const requiredFields = ['studentName', 'course', 'university'];
  const details = [];

  for (const field of requiredFields) {
    const value = body[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      details.push({ field, message: `${field} is required` });
    }
  }

  if (details.length) {
    throw makeError(400, 'VALIDATION_ERROR', 'Invalid request body', details);
  }
}

async function seedDefaultDocuments(applicationId) {
  const docs = DEFAULT_REQUIRED_DOCUMENTS.map((name) => ({
    applicationId,
    name,
    required: true,
    uploaded: false,
  }));

  await Document.insertMany(docs, { ordered: false });
}

async function getApplicationWithAgentScope(req, applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  if (req.role === 'agent') {
    if (!req.agentId) {
      throw makeError(400, 'AGENT_ID_REQUIRED', 'X-Agent-Id header is required for agent requests');
    }
    if (!application.agentId || application.agentId !== req.agentId) {
      // Deliberately return 404 to avoid leaking resource existence across agents.
      throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
    }
  }

  return application;
}

router.use(requireRole());

router.post('/', async (req, res, next) => {
  try {
    validateCreateBody(req.body);

    if (req.role === 'agent' && !req.agentId) {
      throw makeError(400, 'AGENT_ID_REQUIRED', 'X-Agent-Id header is required for agent requests');
    }

    const application = await Application.create({
      studentName: req.body.studentName.trim(),
      course: req.body.course.trim(),
      university: req.body.university.trim(),
      currentStage: 'new_app',
      agentId: req.role === 'agent' ? req.agentId : normalizeOptionalString(req.body.agentId),
    });

    await seedDefaultDocuments(application._id);

    res.status(201).json({ data: application });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return next(
        makeError(
          400,
          'VALIDATION_ERROR',
          'Validation failed',
          Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }))
        )
      );
    }
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const query = req.role === 'agent' ? { agentId: req.agentId || '__missing_agent__' } : {};
    if (req.role === 'agent' && !req.agentId) {
      throw makeError(400, 'AGENT_ID_REQUIRED', 'X-Agent-Id header is required for agent requests');
    }

    const applications = await Application.find(query).sort({ createdAt: -1 });
    res.json({ data: applications });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/available-transitions', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);
    const transitions = await getAvailableApplicationTransitions(application._id, req.role);
    res.json({ transitions });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/available-actions', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);
    const actions = await getAvailableApplicationActions(application._id, req.role);
    res.json({ actions });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/actions', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const { action, payload } = req.body || {};
    if (typeof action !== 'string' || !action.trim()) {
      throw makeError(400, 'VALIDATION_ERROR', 'Action name is required');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);
    const updated = await executeApplicationAction(
      application._id,
      action.trim(),
      req.role,
      payload || {}
    );
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/transitions', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);
    const updated = await transitionApplication(application._id, req.body?.to, req.role);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/documents', requireRole('agent', 'counsellor', 'qa_officer', 'admission_officer'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      throw makeError(400, 'VALIDATION_ERROR', 'Document name is required');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);

    const normalizedName = name.trim();
    const document = await Document.findOneAndUpdate(
      { applicationId: application._id, name: normalizedName },
      {
        $set: {
          uploaded: true,
          uploadedAt: new Date(),
          required: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ data: document });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/notes', requireRole('agent', 'counsellor', 'qa_officer', 'admission_officer'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const { body } = req.body || {};
    if (typeof body !== 'string' || !body.trim()) {
      throw makeError(400, 'VALIDATION_ERROR', 'Note body is required');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);

    const note = await Note.create({
      applicationId: application._id,
      body: body.trim(),
      role: req.role,
    });

    res.status(201).json({ data: note });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const application = await getApplicationWithAgentScope(req, req.params.id);

    res.json({ data: application });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
