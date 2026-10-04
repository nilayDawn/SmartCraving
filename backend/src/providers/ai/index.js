const GroqProvider = require("./groq.provider");

let aiProviderInstance = null;

const getAIProvider = () => {
  if (!aiProviderInstance) {
    aiProviderInstance = new GroqProvider();
  }
  return aiProviderInstance;
};

module.exports = {
  getAIProvider,
};
