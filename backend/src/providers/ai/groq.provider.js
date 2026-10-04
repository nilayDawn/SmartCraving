const axios = require("axios");
const AIProviderInterface = require("./ai.interface");
const env = require("../../config/env");
const logger = require("../../core/utils/logger");

class GroqProvider extends AIProviderInterface {
  constructor() {
    super();
    this.apiKey = env.groq.apiKey;
    this.model = env.groq.model;
    this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
  }

  async generateDishMetadata({
    name,
    category = "Main Course",
    spiceLevel = "Medium",
    price = 10,
  }) {
    if (!name) {
      throw new Error("Dish name is required to generate AI metadata");
    }

    const prompt = `
You are a professional food classification assistant.
Generate ONLY valid JSON. No markdown. No explanation text.

IMPORTANT RULES:
- Tags must be accurate restaurant-style tags
- Do NOT misclassify dishes
- Do NOT label main courses as desserts
- Allergens must be realistic
- Serves must be realistic (1 or 2)
- bestFor must be meal timings only

Dish Name: ${name}
Category: ${category}
Spice Level: ${spiceLevel}
Base Price: ${price}

Return JSON in this EXACT format:
{
  "description": "string",
  "tags": ["string"],
  "allergens": ["string"],
  "serves": "string",
  "bestFor": ["string"]
}
`;

    if (this.apiKey) {
      try {
        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 300,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 7000,
          },
        );

        const content = response.data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim(); // Remove any code block formatting
          const parsed = JSON.parse(cleaned);
          if (parsed && parsed.description) {
            return parsed;
          }
        }
      } catch (err) {
        logger.warn(`[AI Warning] Groq API call failed, using smart fallback: ${err.message}`);
      }
    }

    // High quality fallback generator guarantees this operation never breaks
    return {
      description: `A delicious and freshly prepared ${name} cooked with authentic spices, fresh garden herbs, and premium ingredients. Perfectly balanced to offer a memorable dining experience.`,
      tags: [category || "Chef Special", "Fresh & Hot", "Gourmet Choice"],
      allergens: ["May contain dairy/nuts"],
      serves: "1-2 People",
      bestFor: ["Lunch", "Dinner"],
    };
  }

  async analyzeReviews(reviews = [], subject = "restaurant") {
    if (!reviews || !reviews.length) {
      return this._buildFallbackReviewSummary([]);
    }

    if (this.apiKey) {
      try {
        const reviewTexts = reviews.map((r) => r.Comment).filter(Boolean);
        const prompt = `
Analyze all ${subject} reviews together.
Return ONLY a JSON object with this exact structure:
{
  "sentiment": "positive" | "negative" | "mixed",
  "summaryBullets": ["bullet 1", "bullet 2", "bullet 3"],
  "topMentions": ["keyword 1", "keyword 2", "keyword 3"]
}

Reviews:
${reviewTexts.join("\n")}
`;

        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 8000,
          },
        );

        const content = response.data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && parsed.sentiment) {
            return {
              sentiment: parsed.sentiment,
              summaryBullets: parsed.summaryBullets || [],
              topMentions: parsed.topMentions || [],
            };
          }
        }
      } catch (err) {
        logger.warn(`[AI Warning] Review analysis via Groq failed, using heuristic fallback: ${err.message}`);
      }
    }

    return this._buildFallbackReviewSummary(reviews);
  }

  _buildFallbackReviewSummary(reviews = []) {
    const averageRating = reviews.length
      ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
      : 0;
    const sentiment = averageRating >= 4 ? "positive" : averageRating <= 2.5 ? "negative" : "mixed";
    const stopWords = new Set(["the", "and", "was", "with", "this", "that", "very", "for", "are", "but", "not", "you", "they", "have", "had", "from", "were", "been", "good"]);
    const words = reviews
      .flatMap((review) => String(review.Comment || "").toLowerCase().match(/[a-z]{4,}/g) || [])
      .filter((word) => !stopWords.has(word));
    const counts = words.reduce((result, word) => ({ ...result, [word]: (result[word] || 0) + 1 }), {});
    const topMentions = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([word]) => word);

    return {
      sentiment,
      summaryBullets: [
        `Based on ${reviews.length} guest review${reviews.length === 1 ? "" : "s"}, the average rating is ${averageRating.toFixed(1)}/5.`,
        topMentions.length ? `Guests commonly mention ${topMentions.join(", ")}.` : "Guests have shared varied feedback about their experience.",
        sentiment === "positive" ? "Overall feedback is strongly favorable." : sentiment === "negative" ? "Feedback suggests there are areas that need improvement." : "Feedback is mixed, with both positive and critical experiences.",
      ],
      topMentions,
    };
  }
}

module.exports = GroqProvider;
