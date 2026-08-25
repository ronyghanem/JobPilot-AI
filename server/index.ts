import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

const PORT = 3001;

if (!process.env.GROQ_API_KEY) {
  console.error(
    "❌ GROQ_API_KEY is missing from .env"
  );

  process.exit(1);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(
  cors({
    origin: "*",
  })
);

app.use(
  express.json({
    limit: "5mb",
  })
);

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Home
|--------------------------------------------------------------------------
*/

app.get("/", (_req, res) => {
  res.json({
    message: "JobPilot AI server is running.",
  });
});

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
          error: "CV text is required.",
        });
      }

      console.log("");
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
You are JobPilot AI.

Your job is to analyze a candidate's CV and convert it into a structured candidate profile.

IMPORTANT:

1. Extract ONLY information that actually appears in the CV.
2. NEVER invent information.
3. If information is missing, return an empty string, empty array, or empty object as appropriate.
4. Preserve the candidate's actual experience.
5. Do not exaggerate skills.
6. Do not infer experience that is not explicitly supported.
7. Return ONLY valid JSON.
8. Do not use markdown.
9. Do not put JSON inside code fences.

The output must follow exactly this structure:

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

Education items must use:

{
  "degree": "",
  "institution": "",
  "field": "",
  "startDate": "",
  "endDate": ""
}

Experience items must use:

{
  "jobTitle": "",
  "company": "",
  "location": "",
  "startDate": "",
  "endDate": "",
  "description": ""
}

Project items must use:

{
  "name": "",
  "description": "",
  "technologies": []
}
`;

      const userPrompt = `
Analyze this CV and extract the candidate profile.

CV:

${cvText}
`;

      console.log(
        "🚀 Sending CV to Groq..."
      );

      const completion =
        await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],

          temperature: 0.1,

          max_completion_tokens: 2500,

          include_reasoning: false,
        });

      const rawAnswer =
        completion.choices[0]?.message?.content?.trim();

      if (!rawAnswer) {
        throw new Error(
          "Groq returned an empty CV analysis."
        );
      }

      console.log(
        "🤖 Raw CV analysis:"
      );

      console.log(rawAnswer);

      /*
       * Remove markdown code fences if
       * the model accidentally adds them.
       */

      const cleanedAnswer =
        rawAnswer
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

      let profile: Profile;

      try {
        profile = JSON.parse(
          cleanedAnswer
        );
      } catch (parseError) {
        console.error(
          "❌ Failed to parse Groq JSON:"
        );

        console.error(
          cleanedAnswer
        );

        throw parseError;
      }

      console.log(
        "✅ CV profile extracted successfully."
      );

      console.log(
        "Candidate:",
        `${profile.firstName} ${profile.lastName}`
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

      return res.json({
        success: true,
        profile,
      });
    } catch (error) {
      console.error(
        "❌ CV analysis error:"
      );

      console.error(error);

      return res.status(500).json({
        success: false,
        error:
          "Failed to analyze CV.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Generate Job Application Answer
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
      }: GenerateAnswerRequest = req.body;

      if (!question) {
        return res.status(400).json({
          error: "Question is required.",
        });
      }

      if (!jobDescription) {
        return res.status(400).json({
          error:
            "Job description is required.",
        });
      }

      if (!profile) {
        return res.status(400).json({
          error: "Profile is required.",
        });
      }

      console.log("");
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
        "Candidate:",
        `${profile.firstName} ${profile.lastName}`
      );

      const systemPrompt = `
You are JobPilot AI, an intelligent job application assistant.

Your task is to answer the EXACT application question using the candidate's real profile and the job description.

IMPORTANT RULES:

1. Answer the exact question.
2. Do not give the same answer to different questions.
3. Use ONLY information contained in the candidate profile.
4. Never invent experience.
5. Never invent employers.
6. Never invent education.
7. Never invent certifications.
8. Never invent skills.
9. Never invent projects.
10. Never claim experience that isn't supported by the profile.
11. Write in first person.
12. Sound natural and professional.
13. Keep the answer concise.
14. Adapt the answer to the specific job.
15. Do not mention that you are an AI.
16. Return ONLY the final answer.

For "Why do you want to work with us?"
Focus on motivation and connection between the candidate and the role.

For "Tell us about your experience"
Focus on actual education, work experience, internships, freelance work, projects and technical experience.

For questions about skills:
Use only the skills in the profile.

For questions about salary:
Never invent a salary.

For questions about availability:
Never invent an availability date.
`;

      const userPrompt = `
CANDIDATE PROFILE
=================

${JSON.stringify(
  profile,
  null,
  2
)}

JOB DESCRIPTION
===============

${jobDescription}

APPLICATION QUESTION
====================

${question}

Write the best truthful answer to this exact question.
`;

      console.log(
        "🚀 Sending request to Groq..."
      );

      const completion =
        await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],

          temperature: 0.7,

          max_completion_tokens: 300,

          include_reasoning: false,
        });

      const answer =
        completion.choices[0]?.message?.content?.trim();

      if (!answer) {
        throw new Error(
          "Groq returned an empty answer."
        );
      }

      console.log(
        "✅ Groq generated answer:"
      );

      console.log(answer);

      return res.json({
        success: true,
        answer,
      });
    } catch (error) {
      console.error(
        "❌ Groq generation error:"
      );

      console.error(error);

      return res.status(500).json({
        success: false,
        error:
          "Failed to generate AI answer.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log("");

  console.log(
    "===================================="
  );

  console.log(
    "🚀 JobPilot AI server"
  );

  console.log(
    `http://localhost:${PORT}`
  );

  console.log(
    "🤖 AI Provider: Groq"
  );

  console.log(
    "🧠 Model: openai/gpt-oss-20b"
  );

  console.log(
    "===================================="
  );

  console.log("");
});