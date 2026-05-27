class MockAiProvider {
  async assessReadiness({ application, requiredDocuments, uploadedDocuments }) {
    const requiredSet = new Set(requiredDocuments);
    const uploadedSet = new Set(uploadedDocuments);
    const missingDocuments = [...requiredSet].filter((doc) => !uploadedSet.has(doc));

    const incompatibilities = [];
    const risks = [];

    if (!application.course || !application.university) {
      incompatibilities.push('Course or university metadata is incomplete.');
    }

    if (missingDocuments.length > 0) {
      risks.push('Required documentation is incomplete for confident review.');
    }

    const readinessScore =
      missingDocuments.length === 0 ? 'ready' : missingDocuments.length <= 2 ? 'needs_attention' : 'not_ready';

    return {
      readinessScore,
      missingDocuments,
      incompatibilities,
      risks,
      summary:
        missingDocuments.length === 0
          ? 'Documents appear complete for this stage. Proceed with human review.'
          : 'Application needs attention before manual review due to missing documents.',
    };
  }
}

module.exports = {
  MockAiProvider,
};
