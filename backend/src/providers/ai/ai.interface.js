/* eslint-disable no-unused-vars */
/**
 * Abstract AI Provider Interface
 * All LLM and NLP adapters (Groq, OpenAI, Google Gemini, Anthropic, Ollama) must implement this.
 */
class AIProviderInterface {
  async generateDishMetadata(params) {
    throw new Error("Method generateDishMetadata() must be implemented.");
  }

  async analyzeReviews(reviews, subject = "restaurant") {
    throw new Error("Method analyzeReviews() must be implemented.");
  }
}

module.exports = AIProviderInterface;
