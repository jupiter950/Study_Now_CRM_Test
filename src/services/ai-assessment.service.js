const { AiAssessment, Application, Document } = require('../models');
const { createAiProvider } = require('./ai');
const { STAGES } = require('../workflow/stages');

const REVIEW_STAGES = [STAGES.QA_REVIEW, STAGES.APP_REVIEW];

function makeError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
}

function toAssessmentPayload(raw = {}) {
  return {
    readinessScore: raw.readinessScore || 'needs_attention',
    missingDocuments: Array.isArray(raw.missingDocuments) ? raw.missingDocuments : [],
    incompatibilities: Array.isArray(raw.incompatibilities) ? raw.incompatibilities : [],
    risks: Array.isArray(raw.risks) ? raw.risks : [],
    summary: typeof raw.summary === 'string' ? raw.summary : 'Assessment generated for manual review.',
    generatedAt: new Date().toISOString(),
    advisory: true,
  };
}

async function buildAssessmentContext(application) {
  const docs = await Document.find({ applicationId: application._id }).lean();
  const requiredDocuments = docs.filter((d) => d.required).map((d) => d.name);
  const uploadedDocuments = docs.filter((d) => d.uploaded).map((d) => d.name);
  return { requiredDocuments, uploadedDocuments };
}

async function triggerAiAssessment(applicationId, stageOverride = null) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  const stage = stageOverride || application.currentStage;
  if (!REVIEW_STAGES.includes(stage)) {
    throw makeError(422, 'ASSESSMENT_STAGE_INVALID', 'AI assessment is only available at QA Review or App Review');
  }

  const provider = createAiProvider();
  const { requiredDocuments, uploadedDocuments } = await buildAssessmentContext(application);

  let rawResult;
  try {
    rawResult = await provider.assessReadiness({
      application,
      requiredDocuments,
      uploadedDocuments,
    });
  } catch (error) {
    console.error('AI assessment provider failed, using fallback advisory result:', error.message);
    rawResult = {
      readinessScore: 'needs_attention',
      missingDocuments: requiredDocuments.filter((name) => !uploadedDocuments.includes(name)),
      incompatibilities: [],
      risks: ['AI provider unavailable; proceed with manual review.'],
      summary: 'AI assessment unavailable. Manual review should continue using checklist.',
    };
  }

  const result = toAssessmentPayload(rawResult);
  const created = await AiAssessment.create({
    applicationId: application._id,
    stage,
    result,
    advisory: true,
    generatedAt: new Date(result.generatedAt),
  });

  return created;
}

async function getLatestAssessmentForCurrentReviewStage(applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw makeError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  }

  const stage = application.currentStage;
  if (!REVIEW_STAGES.includes(stage)) {
    return null;
  }

  return AiAssessment.findOne({ applicationId: application._id, stage }).sort({ createdAt: -1 });
}

function isReviewStage(stage) {
  return REVIEW_STAGES.includes(stage);
}

module.exports = {
  REVIEW_STAGES,
  isReviewStage,
  triggerAiAssessment,
  getLatestAssessmentForCurrentReviewStage,
};
