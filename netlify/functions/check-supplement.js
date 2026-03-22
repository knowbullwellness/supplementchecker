const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { supplement } = JSON.parse(event.body);
    if (!supplement) {
      return { statusCode: 400, body: JSON.stringify({ error: "No supplement provided" }) };
    }

    const systemPrompt = `You are the No Bull Supplement Analyzer for Know Bull Wellness — a no-nonsense, science-first health brand that cuts through fitness industry hype. Give brutally honest, research-backed supplement assessments.

Return ONLY a valid JSON object, no markdown, no preamble, no backticks:
{
  "name": "Clean product name",
  "verdict": "APPROVED" | "USE WITH CAUTION" | "SKIP IT",
  "confidenceScore": 0-100,
  "summary": "2-3 sentence plain-language verdict",
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1", "con 2"],
  "thirdPartyTested": true | false | null,
  "evidenceStrength": "Strong" | "Moderate" | "Weak" | "None",
  "amazonSearchQuery": "best amazon search query for this exact product"
}

Verdict guide:
- APPROVED (score 70-100): Strong evidence, clean ingredients, worth taking
- USE WITH CAUTION (score 40-69): Mixed evidence or quality concerns  
- SKIP IT (score 0-39): Weak or no evidence, proprietary blends, red flags`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: `Analyze this supplement: ${supplement}` }],
    });

    const raw = response.content[0].text.trim();
    const analysis = JSON.parse(raw);

    // Build dynamic Amazon search link with affiliate tag
    const searchQuery = encodeURIComponent(analysis.amazonSearchQuery || supplement);
    analysis.amazonLink = `https://www.amazon.com/s?k=${searchQuery}&tag=knowbullwelln-20`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Analysis failed. Please try again." }),
    };
  }
};
