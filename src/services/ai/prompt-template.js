function buildReadinessPrompt(application, requiredDocuments = [], uploadedDocuments = []) {
  return [
    'You are an admissions readiness assistant.',
    'Return strictly valid JSON with this schema:',
    '{',
    '  "readinessScore": "ready | needs_attention | not_ready",',
    '  "missingDocuments": ["..."],',
    '  "incompatibilities": ["..."],',
    '  "risks": ["..."],',
    '  "summary": "string"',
    '}',
    '',
    'Assess whether this student application is ready for review.',
    `Stage: ${application.currentStage}`,
    `Student: ${application.studentName}`,
    `Course: ${application.course}`,
    `University: ${application.university}`,
    `Required documents: ${requiredDocuments.join(', ') || 'none provided'}`,
    `Uploaded documents: ${uploadedDocuments.join(', ') || 'none'}`,
    '',
    'Guidance:',
    '- missingDocuments should list required docs that are not uploaded.',
    '- incompatibilities should include any data mismatch risk.',
    '- risks should include process or quality concerns.',
    '- summary should be concise and advisory.',
  ].join('\n');
}

module.exports = {
  buildReadinessPrompt,
};
