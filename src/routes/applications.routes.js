const express = require('express');
const mongoose = require('mongoose');
const { Application, Document, Note } = require('../models');
const {
  getAvailableApplicationTransitions,
  transitionApplication,
} = require('../services/transition.service');

const router = express.Router();

const DEFAULT_REQUIRED_DOCUMENTS = ['passport', 'transcript', 'english_test', 'financial_evidence'];

function makeError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function normalizeRole(roleValue) {
  return typeof roleValue === 'string' ? roleValue.trim().toLowerCase() : '';
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

router.post('/', async (req, res, next) => {
  try {
    validateCreateBody(req.body);

    const role = normalizeRole(req.header('X-Role'));
    const headerAgentId = req.header('X-Agent-Id');

    if (role === 'agent' && (!headerAgentId || !headerAgentId.trim())) {
      throw makeError(400, 'AGENT_ID_REQUIRED', 'X-Agent-Id header is required for agent requests');
    }

    const application = await Application.create({
      studentName: req.body.studentName.trim(),
      course: req.body.course.trim(),
      university: req.body.university.trim(),
      currentStage: 'new_app',
      agentId: role === 'agent' ? headerAgentId.trim() : normalizeOptionalString(req.body.agentId),
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

router.get('/', async (_req, res, next) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
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

    const transitions = await getAvailableApplicationTransitions(req.params.id, req.header('X-Role'));
    res.json({ transitions });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/transitions', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const application = await transitionApplication(req.params.id, req.body?.to, req.header('X-Role'));
    res.json({ data: application });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/documents', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      throw makeError(400, 'VALIDATION_ERROR', 'Document name is required');
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
    }

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

router.post('/:id/notes', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const { body } = req.body || {};
    if (typeof body !== 'string' || !body.trim()) {
      throw makeError(400, 'VALIDATION_ERROR', 'Note body is required');
    }

    const role = normalizeRole(req.header('X-Role')) || 'counsellor';
    const application = await Application.findById(req.params.id);
    if (!application) {
      throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
    }

    const note = await Note.create({
      applicationId: application._id,
      body: body.trim(),
      role,
    });

    res.status(201).json({ data: note });
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

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw makeError(400, 'INVALID_ID', 'Invalid application id');
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
    }

    res.json({ data: application });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
