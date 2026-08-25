import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  express.json({
    limit: "2mb",
  })
);

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;

  summary: string;

  education: Array<{
    degree: string;
    institution: string;
    field: string;
    startDate: string;
    endDate: string;
  }>;

  experience: Array<{
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;

  skills: string[];

  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;

  certifications: string[];

  languages: string[];
};

type GenerateAnswerRequest = {
  question: string;
  jobDescription: string;
  profile: Profile;
};

type AnalyzeCVRequest = {
  cvText: string;
};

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
  "openai/gpt-oss-20b";

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "JobPilot AI API is running.",
    provider: "Groq",
    model: GROQ_MODEL,
  });
});

/*
|--------------------------------------------------------------------------
| Groq helper
|--------------------------------------------------------------------------
*/

async function callGroq(
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>,
  temperature = 0.2
) {
  const apiKey =
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  console.log(
    "🚀 Sending request to Groq..."
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

        messages,

        temperature,

        max_tokens: 2000,
      }),
    });

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "❌ Groq API error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        "Groq API request failed."
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq returned an empty response."
    );
  }

  return content;
}

/*
|--------------------------------------------------------------------------
| Analyze CV
|--------------------------------------------------------------------------
*/

app.post(
  "/api/analyze-cv",
  async (req, res) => {
    try {
      const {
        cvText,
      }: AnalyzeCVRequest = req.body;

      if (!cvText) {
        return res.status(400).json({
          success: false,
          error:
            "CV text is required.",
        });
      }

      console.log(
        "===================================="
      );

      console.log(
        "📄 JOBPILOT CV ANALYSIS"
      );

      console.log(
        "===================================="
      );

      console.log(
        "CV characters:",
        cvText.length
      );

      const systemPrompt = `
You are JobPilot AI, an expert CV parser.

Your job is to analyze a candidate's CV and return
a structured JSON profile.

IMPORTANT:
- Only use information that actually exists in the CV.
- Do not invent information.
- If information is missing, use an empty string or empty array.
- Preserve the candidate's real experience.
- Extract projects if they appear anywhere in the CV.
- Extract all relevant technical and professional skills.
- Extract education.
- Extract certifications.
- Extract languages.
- Extract LinkedIn, GitHub and portfolio URLs if present.

Return ONLY valid JSON.

The JSON must follow exactly this structure:

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

  "education": [
    {
      "degree": "",
      "institution": "",
      "field": "",
      "startDate": "",
      "endDate": ""
    }
  ],

  "experience": [
    {
      "jobTitle": "",
      "company": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],

  "skills": [],

  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": []
    }
  ],

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

      const rawAnswer =
        await callGroq(
          [
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
          0.1
        );

      console.log(
        "🤖 Raw CV AI response:"
      );

      console.log(
        rawAnswer
      );

      /*
       * Remove markdown JSON fences
       * if the model accidentally adds them.
       */

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

      let profile: Profile;

      try {
        profile =
          JSON.parse(cleaned);
      } catch (parseError) {
        console.error(
          "❌ JSON parsing failed:",
          parseError
        );

        console.error(
          "Raw response:",
          rawAnswer
        );

        throw new Error(
          "AI returned invalid profile JSON."
        );
      }

      console.log(
        "===================================="
      );

      console.log(
        "✅ CV PROFILE EXTRACTED"
      );

      console.log(
        "Candidate:",
        profile.firstName,
        profile.lastName
      );

      console.log(
        "Skills:",
        profile.skills?.length || 0
      );

      console.log(
        "Experience:",
        profile.experience?.length || 0
      );

      console.log(
        "Projects:",
        profile.projects?.length || 0
      );

      console.log(
        "===================================="
      );

      return res.json({
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
);

/*
|--------------------------------------------------------------------------
| Generate application answer
|--------------------------------------------------------------------------
*/

app.post(
  "/api/generate-answer",
  async (req, res) => {
    try {
      const {
        question,
        jobDescription,
        profile,
      }: GenerateAnswerRequest =
        req.body;

      if (!question) {
        return res.status(400).json({
          success: false,
          error:
            "Question is required.",
        });
      }

      if (!jobDescription) {
        return res.status(400).json({
          success: false,
          error:
            "Job description is required.",
        });
      }

      if (!profile) {
        return res.status(400).json({
          success: false,
          error:
            "Profile is required.",
        });
      }

      console.log(
        "===================================="
      );

      console.log(
        "🤖 JOBPILOT AI GENERATION"
      );

      console.log(
        "===================================="
      );

      console.log(
        "Question:",
        question
      );

      console.log(
        "Job description length:",
        jobDescription.length
      );

      console.log(
        "Candidate:",
        `${profile.firstName} ${profile.lastName}`
      );

      const systemPrompt = `
You are JobPilot AI.

You help a candidate answer job application questions.

Your answers must be:

- truthful
- personalized
- professional
- concise
- natural
- based ONLY on the candidate profile
- strongly connected to the job description

Never invent:
- jobs
- companies
- degrees
- skills
- achievements
- years of experience
- certifications

Write as the candidate in first person.

Do not mention that you are an AI.

Avoid generic answers.
`;

      const userPrompt = `
CANDIDATE PROFILE:

${JSON.stringify(
  profile,
  null,
  2
)}

JOB DESCRIPTION:

${jobDescription}

APPLICATION QUESTION:

${question}

Write the best answer for this specific application.
`;

      const answer =
        await callGroq(
          [
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
          0.5
        );

      console.log(
        "✅ Answer generated."
      );

      return res.json({
        success: true,
        answer: answer.trim(),
      });
    } catch (error) {
      console.error(
        "❌ Generate answer error:",
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
);

/*
|--------------------------------------------------------------------------
| Export for Vercel
|--------------------------------------------------------------------------
*/

export default app;