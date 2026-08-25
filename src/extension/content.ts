console.log("JobPilot AI content script loaded.");

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
};

type DetectedField = {
  element:
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;

  type: string;
  name: string;
  id: string;
  placeholder: string;
  label: string;
};

type AIQuestion = {
  element: HTMLTextAreaElement | HTMLInputElement;
  question: string;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFieldLabel(element: HTMLElement): string {
  const id = element.getAttribute("id");

  if (id) {
    const label = document.querySelector(
      `label[for="${CSS.escape(id)}"]`
    );

    if (label?.textContent) {
      return label.textContent.trim();
    }
  }

  const parentLabel = element.closest("label");

  if (parentLabel?.textContent) {
    return parentLabel.textContent.trim();
  }

  const ariaLabel = element.getAttribute("aria-label");

  if (ariaLabel) {
    return ariaLabel.trim();
  }

  return "";
}

function detectFields(): DetectedField[] {
  const elements = Array.from(
    document.querySelectorAll<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >("input, textarea, select")
  );

  return elements
    .filter((element) => {
      const type =
        element.getAttribute("type")?.toLowerCase();

      return (
        type !== "hidden" &&
        type !== "submit" &&
        type !== "button" &&
        type !== "reset"
      );
    })
    .map((element) => ({
      element,

      type:
        element.getAttribute("type") ||
        element.tagName.toLowerCase(),

      name: element.getAttribute("name") || "",

      id: element.getAttribute("id") || "",

      placeholder:
        element.getAttribute("placeholder") || "",

      label: getFieldLabel(element),
    }));
}

function getFieldText(field: DetectedField): string {
  return normalizeText(
    [
      field.label,
      field.name,
      field.id,
      field.placeholder,
    ].join(" ")
  );
}

function containsAny(
  text: string,
  values: string[]
): boolean {
  return values.some((value) =>
    text.includes(normalizeText(value))
  );
}

function findProfileValue(
  field: DetectedField,
  profile: Profile
): string | null {
  const text = getFieldText(field);

  if (
    field.type === "email" ||
    containsAny(text, [
      "email",
      "email address",
      "e-mail",
      "e mail",
    ])
  ) {
    return profile.email;
  }

  if (
    field.type === "tel" ||
    containsAny(text, [
      "phone",
      "phone number",
      "telephone",
      "telephone number",
      "mobile",
      "mobile number",
      "mobile phone",
      "cell phone",
      "contact number",
    ])
  ) {
    return profile.phone;
  }

  if (
    containsAny(text, [
      "linkedin",
      "linkedin profile",
      "linkedin profile url",
      "linkedin url",
      "linked in",
    ])
  ) {
    return profile.linkedin;
  }

  if (
    containsAny(text, [
      "github",
      "github profile",
      "github profile url",
      "github url",
      "git hub",
    ])
  ) {
    return profile.github;
  }

  if (
    containsAny(text, [
      "portfolio",
      "portfolio url",
      "personal website",
      "personal site",
      "personal website url",
      "website",
      "website url",
    ])
  ) {
    return profile.portfolio;
  }

  if (
    containsAny(text, [
      "current city",
      "city",
      "location",
      "country",
      "address",
      "home address",
      "residence",
    ])
  ) {
    return profile.location;
  }

  if (
    containsAny(text, [
      "first name",
      "firstname",
      "given name",
      "givenname",
      "fname",
      "forename",
    ])
  ) {
    return profile.firstName;
  }

  if (
    containsAny(text, [
      "last name",
      "lastname",
      "family name",
      "familyname",
      "surname",
      "lname",
    ])
  ) {
    return profile.lastName;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| SET INPUT VALUE
|--------------------------------------------------------------------------
*/

function setElementValue(
  element:
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement,
  value: string
): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  const valueSetter =
    Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    )?.set;

  if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(
    new Event("input", {
      bubbles: true,
    })
  );

  element.dispatchEvent(
    new Event("change", {
      bubbles: true,
    })
  );
}

/*
|--------------------------------------------------------------------------
| AI QUESTION DETECTION
|--------------------------------------------------------------------------
*/

function detectAIQuestions(): AIQuestion[] {
  const elements = Array.from(
    document.querySelectorAll<
      HTMLTextAreaElement | HTMLInputElement
    >("textarea, input")
  );

  const questions: AIQuestion[] = [];

  elements.forEach((element) => {
    const label = getFieldLabel(element);

    const placeholder =
      element.getAttribute("placeholder") || "";

    const name =
      element.getAttribute("name") || "";

    const id =
      element.getAttribute("id") || "";

    const questionText = normalizeText(
      [
        label,
        placeholder,
        name,
        id,
      ].join(" ")
    );

    const AI_KEYWORDS = [
      "why do you",
      "why are you",
      "why would you",
      "tell us about yourself",
      "tell us about your experience",
      "describe your experience",
      "describe yourself",
      "cover letter",
      "motivation",
      "motivation letter",
      "additional information",
      "anything else",
      "why should we hire you",
      "why do you want",
      "what interests you",
      "what attracted you",
      "career goals",
      "professional goals",
      "relevant experience",
      "work experience",
    ];

    const looksLikeAIQuestion =
      containsAny(
        questionText,
        AI_KEYWORDS
      );

    const isLongText =
      element instanceof HTMLTextAreaElement;

    if (
      isLongText ||
      looksLikeAIQuestion
    ) {
      questions.push({
        element,
        question:
          label ||
          placeholder ||
          name ||
          id ||
          "Application question",
      });
    }
  });

  return questions;
}

/*
|--------------------------------------------------------------------------
| JOB DESCRIPTION
|--------------------------------------------------------------------------
*/

function extractJobDescription(): string {
  const selectors = [
    "[class*='job-description']",
    "[class*='jobDescription']",
    "[id*='job-description']",
    "[id*='jobDescription']",
    "[class*='description']",
    "article",
    "main",
  ];

  for (const selector of selectors) {
    const element =
      document.querySelector(selector);

    if (
      element &&
      element.textContent &&
      element.textContent.trim().length > 100
    ) {
      return element.textContent
        .trim()
        .slice(0, 10000);
    }
  }

  return document.body.innerText
    .trim()
    .slice(0, 10000);
}

/*
|--------------------------------------------------------------------------
| GENERATE AI ANSWER
|--------------------------------------------------------------------------
*/

async function generateAIAnswer(
  question: string,
  jobDescription: string,
  profile: Profile
): Promise<string | null> {
  try {
    console.log(
      "🤖 Sending question to JobPilot AI server..."
    );

    const response = await fetch(
      "http://localhost:3001/api/generate-answer",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          question,
          jobDescription,
          profile,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "JobPilot AI server returned:",
        response.status
      );

      return null;
    }

    const data = await response.json();

    if (!data.answer) {
      console.error(
        "No answer returned from server."
      );

      return null;
    }

    return data.answer;
  } catch (error) {
    console.error(
      "Failed to connect to JobPilot AI server:",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| GENERATE ANSWERS FOR ALL AI QUESTIONS
|--------------------------------------------------------------------------
*/

async function fillAIQuestions(
  profile: Profile
): Promise<void> {
  const questions =
    detectAIQuestions();

  if (questions.length === 0) {
    console.log(
      "No AI questions detected."
    );

    return;
  }

  const jobDescription =
    extractJobDescription();

  console.log(
    `🤖 Generating ${questions.length} AI answers...`
  );

  for (
    let i = 0;
    i < questions.length;
    i++
  ) {
    const question =
      questions[i];

    console.log(
      `🤖 Generating answer ${i + 1}/${questions.length}:`,
      question.question
    );

    const answer =
      await generateAIAnswer(
        question.question,
        jobDescription,
        profile
      );

    if (!answer) {
      console.error(
        `Failed to generate answer for question ${i + 1}.`
      );

      continue;
    }

    setElementValue(
      question.element,
      answer
    );

    console.log(
      `✅ AI answer inserted into: ${question.question}`
    );
  }
}

/*
|--------------------------------------------------------------------------
| MAIN AUTOFILL
|--------------------------------------------------------------------------
*/

async function autofillApplication(): Promise<void> {
  const result =
    await chrome.storage.local.get(
      "jobpilotProfile"
    );

  const profile =
    result.jobpilotProfile as
      | Profile
      | undefined;

  if (!profile) {
    console.log(
      "JobPilot AI: No profile found."
    );

    return;
  }

  /*
   * Fill normal fields.
   */

  const fields =
    detectFields();

  let filledCount = 0;

  fields.forEach((field) => {
    const value =
      findProfileValue(
        field,
        profile
      );

    if (!value) {
      return;
    }

    setElementValue(
      field.element,
      value
    );

    filledCount++;

    console.log(
      `JobPilot AI filled: ${
        field.label ||
        field.name ||
        field.id
      } → ${value}`
    );
  });

  console.log(
    `JobPilot AI filled ${filledCount} normal fields.`
  );

  /*
   * Now generate AI answers.
   */

  await fillAIQuestions(
    profile
  );

  console.log(
    "🎉 JobPilot AI autofill complete."
  );
}

/*
|--------------------------------------------------------------------------
| MESSAGES FROM POPUP
|--------------------------------------------------------------------------
*/

chrome.runtime.onMessage.addListener(
  (message) => {
    if (message.action === "ping") {
      console.log(
        "JobPilot AI ping received."
      );

      return;
    }

    if (message.action === "autofill") {
      void autofillApplication();
    }

    if (message.action === "analyze") {
      console.log(
        "Job description:",
        extractJobDescription()
      );

      console.log(
        "AI questions:",
        detectAIQuestions()
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| INITIAL ANALYSIS
|--------------------------------------------------------------------------
*/

console.log(
  "🤖 JobPilot AI PAGE ANALYSIS"
);

console.log(
  "Normal fields:",
  detectFields().length
);

console.log(
  "AI questions:",
  detectAIQuestions().length
);