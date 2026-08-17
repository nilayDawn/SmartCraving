const axios = require("axios");

const buildFallbackSummary = (reviews = []) => {
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
};

exports.analyzeReviewsWithAI = async (reviews) => {
  try {
    const reviewTexts = reviews.map(
      (review) => review.Comment
    );

    const prompt = `
Analyze all restaurant reviews together.

Return a JSON object with this structure:

{
  "sentiment":"positive",
  "summaryBullets":[
    "point1",
    "point2",
    "point3"
  ],
  "topMentions":[
    "word1",
    "word2",
    "word3"
  ]
}

Reviews:
${reviewTexts.join("\n")}
`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,

        response_format: {
          type: "json_object",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content =
      response.data.choices[0].message.content;

    console.log("AI RESPONSE:");
    console.log(content);

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.log(
        "JSON Parse Failed:",
        parseError.message
      );

      return buildFallbackSummary(reviews);
    }
  } catch (error) {
    console.error(
      "AI Review Analysis Error:",
      error.response?.data || error.message
    );

    return buildFallbackSummary(reviews);
  }
};
