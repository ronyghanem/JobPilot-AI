import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
  "openai/gpt-oss-20b";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { cvText } = req.body;

    if (!cvText) {
      return res.status(400).json({
        success: false,
        error: "CV text is required.",
      });
    }

    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "GROQ_API_KEY is not configured on Vercel.",
      });
    }

    const systemPrompt = `
You are JobPilot AI, an expert CV parser.

Analyze the candidate's CV and return ONLY valid JSON.

Never invent information.

Use empty strings or empty arrays when information is missing.

Extract:

- first name
- last name
- email
- phone
- location
- LinkedIn
- GitHub
- portfolio
- professional summary
- education
- experience
- skills
- projects
- certifications
- languages

Return exactly this structure:

{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "summary": "",

  "education": [],

  "experience": [],

  "skills": [],

  "projects": [],

  "certifications": [],

  "languages": []
}
`;

    const userPrompt = `
Analyze this CV:

---------------- CV START ----------------

${cvText}

---------------- CV END ----------------
`;

    console.log(
      "📄 Sending CV to Groq..."
    );

    const response =
      await fetch(GROQ_API_URL, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model: GROQ_MODEL,

          messages: [
            {
              role: "system",
              content:
                systemPrompt,
            },
            {
              role: "user",
              content:
                userPrompt,
            },
          ],

          temperature: 0.1,

          max_tokens: 3000,
        }),
      });

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Groq CV error:",
        data
      );

      return res.status(500).json({
        success: false,
        error:
          data?.error?.message ||
          "Groq request failed.",
      });
    }

    const rawAnswer =
      data?.choices?.[0]?.message?.content;

    if (!rawAnswer) {
      return res.status(500).json({
        success: false,
        error:
          "Groq returned an empty response.",
      });
    }

    const cleaned =
      rawAnswer
        .replace(
          /```json/gi,
          ""
        )
        .replace(
          /```/g,
          ""
        )
        .trim();

    let profile;

    try {
      profile =
        JSON.parse(cleaned);
    } catch {
      console.error(
        "Invalid JSON from Groq:",
        rawAnswer
      );

      return res.status(500).json({
        success: false,
        error:
          "AI returned invalid profile data.",
      });
    }

    console.log(
      "✅ CV successfully analyzed"
    );

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(
      "❌ CV analysis error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to analyze CV.",
    });
  }
}