const { Document, Note } = require('../models');

const RULES = {
  allRequiredDocumentsUploaded: {
    id: 'allRequiredDocumentsUploaded',
    async evaluate(application) {
      const missingRequiredCount = await Document.countDocuments({
        applicationId: application._id,
        required: true,
        uploaded: false,
      });

      if (missingRequiredCount > 0) {
        return {
          passed: false,
          blockedReason: 'All required documents must be uploaded before moving to App Review.',
        };
      }

      return { passed: true };
    },
  },
  admissionReviewNoteRecorded: {
    id: 'admissionReviewNoteRecorded',
    async evaluate(application) {
      const noteCount = await Note.countDocuments({
        applicationId: application._id,
        role: 'admission_officer',
      });

      if (noteCount < 1) {
        return {
          passed: false,
          blockedReason: 'An admission officer review note is required before moving to Decision.',
        };
      }

      return { passed: true };
    },
  },
};

function getRuleById(ruleId) {
  return RULES[ruleId] || null;
}

async function evaluateRule(ruleId, application, context = {}) {
  const rule = getRuleById(ruleId);

  if (!rule) {
    return {
      ruleId,
      passed: false,
      blockedReason: `Unknown transition rule: ${ruleId}`,
    };
  }

  const result = await rule.evaluate(application, context);
  return {
    ruleId,
    passed: Boolean(result?.passed),
    blockedReason: result?.blockedReason || null,
  };
}

async function evaluateRules(ruleIds = [], application, context = {}) {
  const evaluations = [];

  for (const ruleId of ruleIds) {
    const evaluation = await evaluateRule(ruleId, application, context);
    evaluations.push(evaluation);
    if (!evaluation.passed) {
      break;
    }
  }

  const failed = evaluations.find((item) => !item.passed) || null;
  return {
    passed: !failed,
    failedRule: failed,
    evaluations,
  };
}

module.exports = {
  RULES,
  getRuleById,
  evaluateRule,
  evaluateRules,
};
