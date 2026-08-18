const axios = require("axios");

// In-Memory Cache for AI Review Sentiment Analysis to prevent redundant API calls
const reviewSentimentCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour TTL

// Helper function to create a unique fingerprint hash for a reviews array
const computeReviewsHash = (reviews = []) => {
  if (!reviews || !reviews.length) return "empty";
  const signature = reviews
    .map((r) => `${r.name || ""}_${r.rating || 0}_${(r.Comment || "").trim()}`)
    .sort()
    .join("||");

  // Simple string hash algorithm for fast lookup
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${hash}`;
};

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

exports.analyzeReviewsWithAI = async (reviews, cacheScope = "reviews", subject = "restaurant") => {
  if (!reviews || !reviews.length) {
    return buildFallbackSummary([]);
  }

  const cacheKey = `${cacheScope}:${computeReviewsHash(reviews)}`;
  const cachedEntry = reviewSentimentCache.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
    console.log(`⚡ [AI CACHE HIT] Serving cached review sentiment for key: ${cacheKey}`);
    return cachedEntry.result;
  }

  console.log(`🔍 [AI CACHE MISS] Analyzing ${reviews.length} reviews with AI for key: ${cacheKey}`);

  let result;

  try {
    const reviewTexts = reviews.map((review) => review.Comment).filter(Boolean);

    const prompt = `
Analyze all ${subject} reviews together.

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

    if (process.env.GROQ_API_KEY) {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: { type: "json_object" },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 8000,
        }
      );

      const content = response.data.choices[0].message.content;
      result = JSON.parse(content);
    } else {
      result = buildFallbackSummary(reviews);
    }
  } catch (error) {
    console.error("AI Review Analysis Error, fallback invoked:", error.message);
    result = buildFallbackSummary(reviews);
  }

  // Store in cache
  reviewSentimentCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  return result;
};
