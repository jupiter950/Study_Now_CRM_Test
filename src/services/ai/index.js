const { MockAiProvider } = require('./mock.provider');
const { OpenAiProvider } = require('./openai.provider');

function createAiProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey.trim()) {
    return new OpenAiProvider({ apiKey: apiKey.trim() });
  }
  return new MockAiProvider();
}

module.exports = {
  createAiProvider,
  MockAiProvider,
  OpenAiProvider,
};
