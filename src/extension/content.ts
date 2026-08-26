type JobPilotProfile = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  address?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
  summary?: string;
  education?: string;
  experience?: string;
  skills?: string;
};

type DetectedField = {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  type: string;
  score: number;
  identifier: string;
};

console.log("🚀 JobPilot AI content script loaded.");

/* =========================================================
   HELPERS
========================================================= */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getElementIdentifier(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string {
  return normalize(
    [
      element.name,
      element.id,
      element.placeholder,
      element.getAttribute("aria-label"),
      element.getAttribute("autocomplete"),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getLabelText(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string {
  let text = "";

  if (element.id) {
    const label = document.querySelector(
      `label[for="${CSS.escape(element.id)}"]`
    );

    if (label) {
      text += ` ${label.textContent || ""}`;
    }
  }

  const parentLabel = element.closest("label");

  if (parentLabel) {
    text += ` ${parentLabel.textContent || ""}`;
  }

  const parent = element.parentElement;

  if (parent) {
    text += ` ${parent.textContent || ""}`;
  }

  return normalize(text).slice(0, 500);
}

/* =========================================================
   FIELD DETECTION
========================================================= */

function detectFieldType(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): {
  type: string;
  score: number;
} {
  const identifier = getElementIdentifier(element);
  const label = getLabelText(element);

  const text = `${identifier} ${label}`;

  const type = element instanceof HTMLInputElement
    ? normalize(element.type)
    : "";

  /* EMAIL */

  if (
    type === "email" ||
    /\bemail\b|\be mail\b/.test(text)
  ) {
    return {
      type: "email",
      score: 100,
    };
  }

  /* PHONE */

  if (
    type === "tel" ||
    /\bphone\b|\bmobile\b|\btelephone\b|\bcontact number\b/.test(text)
  ) {
    return {
      type: "phone",
      score: 100,
    };
  }

  /* FIRST NAME */

  if (
    /\bfirst name\b|\bfirstname\b|\bgiven name\b/.test(text)
  ) {
    return {
      type: "firstName",
      score: 100,
    };
  }

  /* LAST NAME */

  if (
    /\blast name\b|\blastname\b|\bsurname\b|\bfamily name\b/.test(text)
  ) {
    return {
      type: "lastName",
      score: 100,
    };
  }

  /* FULL NAME */

  if (
    /\bfull name\b|\bfullname\b|\byour name\b/.test(text)
  ) {
    return {
      type: "fullName",
      score: 100,
    };
  }

  /* LINKEDIN */

  if (
    /\blinkedin\b/.test(text)
  ) {
    return {
      type: "linkedin",
      score: 100,
    };
  }

  /* GITHUB */

  if (
    /\bgithub\b/.test(text)
  ) {
    return {
      type: "github",
      score: 100,
    };
  }

  /* PORTFOLIO */

  if (
    /\bportfolio\b|\bpersonal website\b|\bpersonal site\b/.test(text)
  ) {
    return {
      type: "portfolio",
      score: 100,
    };
  }

  /* WEBSITE */

  if (
    /\bwebsite\b|\bweb site\b/.test(text)
  ) {
    return {
      type: "website",
      score: 90,
    };
  }

  /* CITY */

  if (
    /\bcity\b|\btown\b/.test(text)
  ) {
    return {
      type: "city",
      score: 90,
    };
  }

  /* COUNTRY */

  if (
    /\bcountry\b|\bnationality\b/.test(text)
  ) {
    return {
      type: "country",
      score: 90,
    };
  }

  /* ADDRESS */

  if (
    /\baddress\b|\bstreet address\b|\bhome address\b/.test(text)
  ) {
    return {
      type: "address",
      score: 90,
    };
  }

  /* EDUCATION */

  if (
    /\beducation\b|\bdegree\b|\buniversity\b|\bcollege\b/.test(text)
  ) {
    return {
      type: "education",
      score: 80,
    };
  }

  /* EXPERIENCE */

  if (
    /\bexperience\b|\bwork history\b|\bemployment history\b/.test(text)
  ) {
    return {
      type: "experience",
      score: 80,
    };
  }

  /* SKILLS */

  if (
    /\bskills\b|\btechnical skills\b|\btechnologies\b/.test(text)
  ) {
    return {
      type: "skills",
      score: 80,
    };
  }

  /* SUMMARY */

  if (
    /\bsummary\b|\babout you\b|\bprofessional summary\b|\bprofile\b/.test(
      text
    )
  ) {
    return {
      type: "summary",
      score: 70,
    };
  }

  return {
    type: "unknown",
    score: 0,
  };
}

/* =========================================================
   FIND FORM FIELDS
========================================================= */

function findFields(): DetectedField[] {
  const elements = Array.from(
    document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select")
  );

  const fields: DetectedField[] = [];

  for (const element of elements) {
    if (
      element instanceof HTMLInputElement &&
      ["hidden", "submit", "button", "reset", "file"].includes(
        element.type
      )
    ) {
      continue;
    }

    const detected = detectFieldType(element);

    if (detected.type !== "unknown") {
      fields.push({
        element,
        type: detected.type,
        score: detected.score,
        identifier: getElementIdentifier(element),
      });
    }
  }

  return fields;
}

/* =========================================================
   GET PROFILE
========================================================= */

async function getProfile(): Promise<JobPilotProfile | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["jobpilotProfile"],
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            "JobPilot storage error:",
            chrome.runtime.lastError
          );

          resolve(null);
          return;
        }

        resolve(
          (result.jobpilotProfile as JobPilotProfile) || null
        );
      }
    );
  });
}

/* =========================================================
   SET VALUE
========================================================= */

function setElementValue(
  element:
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement,
  value: string
): void {
  if (!value) {
    return;
  }

  if (element instanceof HTMLSelectElement) {
    const option = Array.from(element.options).find(
      (option) =>
        normalize(option.textContent || "") ===
          normalize(value) ||
        normalize(option.value) === normalize(value)
    );

    if (option) {
      element.value = option.value;
    } else {
      element.value = value;
    }
  } else {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    const descriptor = Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    );

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  /*
   * React / Vue / Angular need these events
   * to recognize that the value changed.
   */

  element.dispatchEvent(
    new Event("input", {
      bubbles: true,
      composed: true,
    })
  );

  element.dispatchEvent(
    new Event("change", {
      bubbles: true,
      composed: true,
    })
  );

  element.dispatchEvent(
    new Event("blur", {
      bubbles: true,
    })
  );
}

/* =========================================================
   PROFILE VALUE
========================================================= */

function getProfileValue(
  profile: JobPilotProfile,
  type: string
): string {
  switch (type) {
    case "firstName":
      return profile.firstName || "";

    case "lastName":
      return profile.lastName || "";

    case "fullName":
      return (
        profile.fullName ||
        `${profile.firstName || ""} ${
          profile.lastName || ""
        }`.trim()
      );

    case "email":
      return profile.email || "";

    case "phone":
      return profile.phone || "";

    case "city":
      return profile.city || "";

    case "country":
      return profile.country || "";

    case "address":
      return profile.address || "";

    case "linkedin":
      return profile.linkedin || "";

    case "github":
      return profile.github || "";

    case "portfolio":
      return (
        profile.portfolio ||
        profile.website ||
        ""
      );

    case "website":
      return (
        profile.website ||
        profile.portfolio ||
        ""
      );

    case "summary":
      return profile.summary || "";

    case "education":
      return profile.education || "";

    case "experience":
      return profile.experience || "";

    case "skills":
      return profile.skills || "";

    default:
      return "";
  }
}

/* =========================================================
   AUTOFILL
========================================================= */

async function autofillApplication(): Promise<{
  success: boolean;
  filled: number;
  message: string;
}> {
  console.log("🤖 JobPilot AI: Starting autofill...");

  const profile = await getProfile();

  if (!profile) {
    console.error(
      "JobPilot AI: No profile found in chrome.storage.local."
    );

    return {
      success: false,
      filled: 0,
      message:
        "No JobPilot profile found. Please save your profile first.",
    };
  }

  console.log(
    "JobPilot AI: Profile loaded:",
    profile
  );

  const fields = findFields();

  console.log(
    `JobPilot AI: Found ${fields.length} recognized fields.`
  );

  let filled = 0;

  for (const field of fields) {
    const value = getProfileValue(
      profile,
      field.type
    );

    if (!value) {
      continue;
    }

    /*
     * Don't overwrite fields that already contain
     * the same value.
     */

    if (
      "value" in field.element &&
      field.element.value === value
    ) {
      continue;
    }

    setElementValue(
      field.element,
      value
    );

    filled++;

    console.log(
      `✅ Filled ${field.type}:`,
      value
    );
  }

  console.log(
    `🎉 JobPilot AI: Filled ${filled} fields.`
  );

  return {
    success: true,
    filled,
    message:
      filled > 0
        ? `Filled ${filled} application fields.`
        : "No matching fields were found.",
  };
}

/* =========================================================
   AI QUESTIONS
========================================================= */

function detectAIQuestions(): Array<{
  element: HTMLTextAreaElement | HTMLInputElement;
  question: string;
}> {
  const elements = Array.from(
    document.querySelectorAll<
      HTMLTextAreaElement | HTMLInputElement
    >("textarea, input")
  );

  const results: Array<{
    element: HTMLTextAreaElement | HTMLInputElement;
    question: string;
  }> = [];

  for (const element of elements) {
    if (
      element instanceof HTMLInputElement &&
      ["hidden", "submit", "button", "file"].includes(
        element.type
      )
    ) {
      continue;
    }

    const label = getLabelText(element);

    if (!label) {
      continue;
    }

    const isQuestion =
      label.includes("?") ||
      /\bwhy\b|\bdescribe\b|\bexplain\b|\btell us\b|\bwhat\b|\bhow\b/.test(
        label
      );

    if (isQuestion) {
      results.push({
        element,
        question: label,
      });
    }
  }

  return results;
}

/* =========================================================
   JOB DESCRIPTION
========================================================= */

function extractJobDescription(): string {
  const selectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="description"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    "article",
    "main",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    if (element?.textContent) {
      const text = element.textContent.trim();

      if (text.length > 200) {
        return text.slice(0, 10000);
      }
    }
  }

  return document.body.innerText.slice(0, 10000);
}

/* =========================================================
   MESSAGE HANDLER
========================================================= */

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
    console.log(
      "📩 JobPilot message received:",
      message
    );

    if (message.action === "ping") {
      sendResponse({
        success: true,
        message:
          "JobPilot AI content script is active.",
      });

      return true;
    }

    if (message.action === "autofill") {
      autofillApplication()
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error(
            "❌ Autofill error:",
            error
          );

          sendResponse({
            success: false,
            filled: 0,
            message:
              error instanceof Error
                ? error.message
                : "Autofill failed.",
          });
        });

      return true;
    }

    if (message.action === "analyze") {
      const fields = findFields();
      const questions = detectAIQuestions();
      const jobDescription =
        extractJobDescription();

      sendResponse({
        success: true,
        fields: fields.length,
        questions: questions.length,
        jobDescription,
      });

      return true;
    }

    return false;
  }
);

/* =========================================================
   DYNAMIC PAGE OBSERVER
========================================================= */

let scanTimeout: number | undefined;

const observer = new MutationObserver(() => {
  if (scanTimeout) {
    window.clearTimeout(scanTimeout);
  }

  scanTimeout = window.setTimeout(() => {
    const fields = findFields();

    console.log(
      `🔄 JobPilot AI: Page changed. ${fields.length} fields detected.`
    );
  }, 500);
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/* =========================================================
   INITIAL ANALYSIS
========================================================= */

setTimeout(() => {
  const fields = findFields();
  const questions = detectAIQuestions();

  console.log("=================================");
  console.log("🤖 JOBPILOT AI PAGE ANALYSIS");
  console.log("=================================");
  console.log(
    "Recognized fields:",
    fields.length
  );
  console.log(
    "AI questions:",
    questions.length
  );
  console.log("=================================");
}, 1000);