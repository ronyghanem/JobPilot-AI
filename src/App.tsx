import { useEffect, useState } from "react";
import "./App.css";

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

const emptyProfile: Profile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
};

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tabs[0]?.id) {
    throw new Error("No active tab found.");
  }

  return tabs[0];
}

async function ensureContentScript(
  tabId: number
): Promise<void> {
  try {
    /*
     * First try to communicate with the
     * existing content script.
     */

    await chrome.tabs.sendMessage(tabId, {
      action: "ping",
    });

    console.log(
      "JobPilot AI content script is already running."
    );
  } catch {
    /*
     * If there is no receiving end,
     * inject content.js manually.
     */

    console.log(
      "Content script not found. Injecting..."
    );

    await chrome.scripting.executeScript({
      target: {
        tabId,
      },

      files: ["content.js"],
    });

    /*
     * Give Chrome a moment to initialize
     * the injected script.
     */

    await new Promise((resolve) =>
      setTimeout(resolve, 100)
    );
  }
}

function App() {
  const [profile, setProfile] =
    useState<Profile>(emptyProfile);

  const [message, setMessage] =
    useState("");

  /*
   * Load saved profile.
   */

  useEffect(() => {
    chrome.storage.local.get(
      ["jobpilotProfile"],
      (result: {
        jobpilotProfile?: Profile;
      }) => {
        if (result.jobpilotProfile) {
          setProfile(
            result.jobpilotProfile
          );
        }
      }
    );
  }, []);

  /*
   * Save profile.
   */

  const saveProfile = () => {
    chrome.storage.local.set(
      {
        jobpilotProfile: profile,
      },
      () => {
        setMessage(
          "Profile saved successfully."
        );

        setTimeout(() => {
          setMessage("");
        }, 2000);
      }
    );
  };

  /*
   * Autofill.
   */

  const autofill = async () => {
    try {
      setMessage(
        "Connecting to the application..."
      );

      const tab =
        await getActiveTab();

      const tabId = tab.id;

      if (!tabId) {
        throw new Error(
          "Active tab has no ID."
        );
      }

      /*
       * Make sure content.js exists
       * inside the current tab.
       */

      await ensureContentScript(
        tabId
      );

      /*
       * Send autofill command.
       */

      await chrome.tabs.sendMessage(
        tabId,
        {
          action: "autofill",
        }
      );

      setMessage(
        "JobPilot AI is filling the application..."
      );
    } catch (error) {
      console.error(
        "JobPilot AI autofill error:",
        error
      );

      setMessage(
        "Could not connect to this page."
      );
    }
  };

  return (
    <div className="app">
      <h1>JobPilot AI</h1>

      <p className="subtitle">
        Your AI job application assistant
      </p>

      <div className="form">
        <input
          placeholder="First Name"
          value={profile.firstName}
          onChange={(e) =>
            setProfile({
              ...profile,
              firstName:
                e.target.value,
            })
          }
        />

        <input
          placeholder="Last Name"
          value={profile.lastName}
          onChange={(e) =>
            setProfile({
              ...profile,
              lastName:
                e.target.value,
            })
          }
        />

        <input
          placeholder="Email"
          value={profile.email}
          onChange={(e) =>
            setProfile({
              ...profile,
              email: e.target.value,
            })
          }
        />

        <input
          placeholder="Phone"
          value={profile.phone}
          onChange={(e) =>
            setProfile({
              ...profile,
              phone: e.target.value,
            })
          }
        />

        <input
          placeholder="Current City"
          value={profile.location}
          onChange={(e) =>
            setProfile({
              ...profile,
              location:
                e.target.value,
            })
          }
        />

        <input
          placeholder="LinkedIn URL"
          value={profile.linkedin}
          onChange={(e) =>
            setProfile({
              ...profile,
              linkedin:
                e.target.value,
            })
          }
        />

        <input
          placeholder="GitHub URL"
          value={profile.github}
          onChange={(e) =>
            setProfile({
              ...profile,
              github:
                e.target.value,
            })
          }
        />

        <input
          placeholder="Portfolio URL"
          value={profile.portfolio}
          onChange={(e) =>
            setProfile({
              ...profile,
              portfolio:
                e.target.value,
            })
          }
        />
      </div>

      <button
        className="save-button"
        onClick={saveProfile}
      >
        Save Profile
      </button>

      <button
        className="autofill-button"
        onClick={autofill}
      >
        ✨ Autofill Application
      </button>

      {message && (
        <p className="message">
          {message}
        </p>
      )}
    </div>
  );
}

export default App;