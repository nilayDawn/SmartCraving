const axios = require("axios");

exports.generateDishDescription = async ({
  name,
  category = "Main Course",
  spiceLevel = "Medium",
  price = 10,
}) => {
  if (!name) {
    throw new Error("Dish name is required to generate AI description");
  }

  const prompt = `
You are a professional food classification assistant.

Generate ONLY valid JSON.
No markdown.
No explanation text.

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

  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  if (groqApiKey) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 7000,
        }
      );

      const content = response.data.choices[0].message.content.trim();
      const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.description) {
        return parsed;
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        console.warn(
          "Groq API rejected GROQ_API_KEY (401). Replace the key in backend/config/config.env and restart the backend; using local fallback generator."
        );
      } else {
        console.warn(
          "Groq AI API Call failed, using smart fallback generator:",
          err.message
        );
      }
    }
  }

  // Smart fallback generator guarantees AI description generation always succeeds
  return {
    description: `A delicious and freshly prepared ${name} cooked with authentic spices, fresh garden herbs, and premium ingredients. Perfectly balanced to offer a memorable dining experience.`,
    tags: [category || "Chef Special", "Fresh & Hot", "Gourmet Choice"],
    allergens: ["May contain dairy/nuts"],
    serves: "1-2 People",
    bestFor: ["Lunch", "Dinner"],
  };
};
