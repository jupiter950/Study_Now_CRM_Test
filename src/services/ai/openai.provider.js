const { buildReadinessPrompt } = require('./prompt-template');

class OpenAiProvider {
  constructor({ apiKey, model = 'gpt-4o-mini', timeoutMs = 10000 } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async assessReadiness({ application, requiredDocuments, uploadedDocuments }) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const prompt = buildReadinessPrompt(application, requiredDocuments, uploadedDocuments);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) {
        throw new Error('OpenAI response did not include content');
      }

      return JSON.parse(raw);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = {
  OpenAiProvider,
};
