import { useEffect, useState } from "react";

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

function Popup() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [fileName, setFileName] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    chrome.storage.local.get(
      ["jobpilotProfile", "jobpilotCVName"],
      (result: {
        jobpilotProfile?: Profile;
        jobpilotCVName?: string;
      }) => {
        if (result.jobpilotProfile) {
          setProfile(result.jobpilotProfile);
        }

        if (result.jobpilotCVName) {
          setFileName(result.jobpilotCVName);
        }
      }
    );
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Extract text from PDF
  |--------------------------------------------------------------------------
  */

const extractPDFText = async (
  file: File
): Promise<string> => {
  console.log(
    "📄 Starting PDF extraction..."
  );

  const pdfjsLib =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  /*
   * Chrome extension worker configuration.
   *
   * PDF.js needs a worker file to process PDFs.
   * We use the worker from the installed pdfjs-dist
   * package and copy it into the extension during build.
   */

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    chrome.runtime.getURL(
      "pdf.worker.mjs"
    );

  const arrayBuffer =
    await file.arrayBuffer();

  console.log(
    "📄 PDF loaded:",
    file.name
  );

  const loadingTask =
    pdfjsLib.getDocument({
      data: arrayBuffer,
    });

  const pdf =
    await loadingTask.promise;

  console.log(
    "📄 PDF pages:",
    pdf.numPages
  );

  let fullText = "";

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    console.log(
      `📄 Reading page ${pageNumber}/${pdf.numPages}...`
    );

    const page =
      await pdf.getPage(
        pageNumber
      );

    const content =
      await page.getTextContent();

    const pageText =
      content.items
        .map((item) => {
          if ("str" in item) {
            return item.str;
          }

          return "";
        })
        .join(" ");

    fullText +=
      pageText + "\n";
  }

  const cleanedText =
    fullText
      .replace(/\s+/g, " ")
      .trim();

  console.log(
    "📄 Extracted characters:",
    cleanedText.length
  );

  if (!cleanedText) {
    throw new Error(
      "No text could be extracted from this PDF."
    );
  }

  return cleanedText;
};
  /*
  |--------------------------------------------------------------------------
  | Upload CV
  |--------------------------------------------------------------------------
  */

  const handleCVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    console.log(
      "📄 Selected CV:",
      file.name
    );

    if (
      file.type !==
      "application/pdf"
    ) {
      setMessage(
        "❌ Please upload a PDF CV."
      );

      return;
    }

    try {
      setLoading(true);

      setMessage(
        "📄 Reading your CV..."
      );

      setFileName(
        file.name
      );

      /*
       * STEP 1
       * Extract PDF text.
       */

      const cvText =
        await extractPDFText(
          file
        );

      console.log(
        "✅ CV text extracted."
      );

      /*
       * STEP 2
       * Send extracted text to backend.
       */

      setMessage(
        "🤖 AI is analyzing your CV..."
      );

      console.log(
        "🚀 Sending CV to JobPilot server..."
      );

      const response =
        await fetch(
          "https://job-pilot-ai-silk.vercel.app/api/analyze-cv",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              cvText,
            }),
          }
        );

      console.log(
        "📡 Server response:",
        response.status
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "❌ Server error:",
          errorText
        );

        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const data =
        await response.json();

      console.log(
        "🤖 CV analysis response:",
        data
      );

      if (
        !data.success ||
        !data.profile
      ) {
        throw new Error(
          data.error ||
            "CV analysis failed."
        );
      }

      const extractedProfile =
        data.profile as Profile;

      /*
       * STEP 3
       * Save profile to Chrome storage.
       */

      await chrome.storage.local.set({
        jobpilotProfile:
          extractedProfile,

        jobpilotCVName:
          file.name,
      });

      console.log(
        "💾 Candidate profile saved."
      );

      setProfile(
        extractedProfile
      );

      setMessage(
        "✅ CV analyzed and profile saved!"
      );
    } catch (error) {
      console.error(
        "❌ CV upload error:"
      );

      console.error(error);

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to analyze CV."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Autofill
  |--------------------------------------------------------------------------
  */

  const autofill = async () => {
    try {
      setMessage(
        "🤖 Starting autofill..."
      );

      const tabs =
        await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

      const tab = tabs[0];

      if (!tab?.id) {
        throw new Error(
          "No active tab."
        );
      }

      try {
        await chrome.tabs.sendMessage(
          tab.id,
          {
            action: "ping",
          }
        );
      } catch {
        await chrome.scripting.executeScript(
          {
            target: {
              tabId: tab.id,
            },

            files: [
              "content.js",
            ],
          }
        );
      }

      await chrome.tabs.sendMessage(
        tab.id,
        {
          action: "autofill",
        }
      );

      setMessage(
        "🚀 Autofill started!"
      );
    } catch (error) {
      console.error(
        "Autofill error:",
        error
      );

      setMessage(
        "❌ Cannot access this page."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="popup">

      <div className="header">

        <h1>
          🤖 JobPilot AI
        </h1>

        <p>
          AI Job Application Assistant
        </p>

      </div>

      {!profile ? (
        <div className="uploadCard">

          <div className="uploadIcon">
            📄
          </div>

          <h2>
            Upload your CV
          </h2>

          <p>
            JobPilot will understand
            your experience, skills,
            education and projects.
          </p>

          <label className="uploadButton">

            Choose CV

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={
                handleCVUpload
              }
              disabled={loading}
              hidden
            />

          </label>

        </div>
      ) : (
        <>
          <div className="profileCard">

            <div className="profileHeader">

              <div className="avatar">
                {profile.firstName
                  ?.charAt(0)
                  ?.toUpperCase() || "?"}
              </div>

              <div>

                <h2>
                  {profile.firstName}{" "}
                  {profile.lastName}
                </h2>

                <p>
                  {profile.email}
                </p>

              </div>

            </div>

            {fileName && (
              <div className="cvName">
                📄 {fileName}
              </div>
            )}

            <div className="stats">

              <div>
                <strong>
                  {profile.skills?.length ||
                    0}
                </strong>

                <span>
                  Skills
                </span>
              </div>

              <div>
                <strong>
                  {profile.experience
                    ?.length || 0}
                </strong>

                <span>
                  Experience
                </span>
              </div>

              <div>
                <strong>
                  {profile.projects
                    ?.length || 0}
                </strong>

                <span>
                  Projects
                </span>
              </div>

            </div>

          </div>

          <button
            className="autofill"
            onClick={autofill}
            disabled={loading}
          >
            ✨ Autofill Application
          </button>

          <label className="changeCV">

            📄 Upload different CV

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={
                handleCVUpload
              }
              disabled={loading}
              hidden
            />

          </label>
        </>
      )}

      {loading && (
        <div className="loading">

          <span className="spinner">
            ⏳
          </span>

          Processing...

        </div>
      )}

      {message && (
        <div className="message">
          {message}
        </div>
      )}

    </div>
  );
}

export default Popup;