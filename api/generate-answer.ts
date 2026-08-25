import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
  "openai/gpt-oss-20b";

type Profile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;

  education?: unknown[];
  experience?: unknown[];
  skills?: string[];

  projects?: unknown[];

  certifications?: string[];
  languages?: string[];
};

type RequestBody = {
  question: string;
  jobDescription: string;
  profile: Profile;
};

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
    const {
      question,
      jobDescription,
      profile,
    }: RequestBody = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "Question is required.",
      });
    }

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        error: "Job description is required.",
      });
    }

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: "Profile is required.",
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

    console.log(
      "===================================="
    );

    console.log(
      "🤖 JOBPILOT AI GENERATION"
    );

    console.log(
      "Question:",
      question
    );

    console.log(
      "Candidate:",
      `${profile.firstName || ""} ${profile.lastName || ""}`
    );

    const systemPrompt = `
You are JobPilot AI.

You help a candidate answer job application questions.

Your answers must be:

- truthful
- personalized
- professional
- natural
- concise
- based only on the candidate profile
- relevant to the specific job

Never invent:
- jobs
- companies
- degrees
- skills
- achievements
- certifications
- years of experience

Write in first person as the candidate.

Do not mention that you are an AI.

Avoid generic answers.
`;

    const userPrompt = `
CANDIDATE PROFILE:

${JSON.stringify(profile, null, 2)}

JOB DESCRIPTION:

${jobDescription}

APPLICATION QUESTION:

${question}

Write the best answer for this specific job application question.
`;

    console.log(
      "🚀 Sending request to Groq..."
    );

    const groqResponse =
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

          temperature: 0.5,

          max_tokens: 1000,
        }),
      });

    const data =
      await groqResponse.json();

    if (!groqResponse.ok) {
      console.error(
        "Groq error:",
        data
      );

      return res.status(500).json({
        success: false,
        error:
          data?.error?.message ||
          "Groq request failed.",
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({
        success: false,
        error:
          "Groq returned an empty answer.",
      });
    }

    console.log(
      "✅ Groq generated answer"
    );

    return res.status(200).json({
      success: true,
      answer: answer.trim(),
    });
  } catch (error) {
    console.error(
      "❌ Generation error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate answer.",
    });
  }
}