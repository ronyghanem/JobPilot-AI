import { useEffect, useState } from "react";
import "./App.css";

import {
  loginUser,
  registerUser,
  logoutUser,
  watchAuth,
} from "./firebaseAuth";

import {
  getProfile,
  saveProfile,
  type JobPilotProfile,
} from "./profile";

import type { User } from "firebase/auth";

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

function App() {
  const [user, setUser] = useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [isRegistering, setIsRegistering] =
    useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [profile, setProfile] =
    useState<Profile>(emptyProfile);

  const [message, setMessage] =
    useState("");

  /*
   * Watch Firebase authentication state.
   */

  useEffect(() => {
    const unsubscribe = watchAuth(
      async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const firebaseProfile =
              await getProfile(
                firebaseUser.uid
              );

            if (firebaseProfile) {
              const loadedProfile: Profile = {
                firstName:
                  firebaseProfile.firstName ||
                  "",
                lastName:
                  firebaseProfile.lastName ||
                  "",
                email:
                  firebaseProfile.email ||
                  firebaseUser.email ||
                  "",
                phone:
                  firebaseProfile.phone ||
                  "",
                location:
                  firebaseProfile.city ||
                  "",
                linkedin:
                  firebaseProfile.linkedin ||
                  "",
                github:
                  firebaseProfile.github ||
                  "",
                portfolio:
                  firebaseProfile.portfolio ||
                  "",
              };

              setProfile(
                loadedProfile
              );

              /*
               * Keep a local copy for the
               * Chrome extension.
               */

              await chrome.storage.local.set({
                jobpilotProfile:
                  loadedProfile,
              });
            } else {
              /*
               * New Firebase account.
               * Start with the user's email.
               */

              const newProfile: Profile = {
                ...emptyProfile,
                email:
                  firebaseUser.email || "",
              };

              setProfile(newProfile);

              await chrome.storage.local.set({
                jobpilotProfile:
                  newProfile,
              });
            }
          } catch (error) {
            console.error(
              "Failed to load Firebase profile:",
              error
            );

            setMessage(
              "Could not load your profile."
            );
          }
        }

        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * Login.
   */

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setMessage("Signing in...");

      await loginUser(
        email,
        password
      );

      setMessage(
        "Signed in successfully."
      );
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setMessage(
        getAuthErrorMessage(error)
      );
    }
  };

  /*
   * Register.
   */

  const handleRegister = async () => {
    if (!email || !password) {
      setMessage(
        "Please enter your email and password."
      );

      return;
    }

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );

      return;
    }

    try {
      setMessage(
        "Creating your account..."
      );

      await registerUser(
        email,
        password
      );

      setMessage(
        "Account created successfully."
      );
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setMessage(
        getAuthErrorMessage(error)
      );
    }
  };

  /*
   * Logout.
   */

  const handleLogout = async () => {
    try {
      await logoutUser();

      setProfile(
        emptyProfile
      );

      setMessage(
        "Logged out successfully."
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setMessage(
        "Could not log out."
      );
    }
  };

  /*
   * Save profile to Firebase + local extension storage.
   */

  const handleSaveProfile = async () => {
    if (!user) {
      setMessage(
        "Please sign in first."
      );

      return;
    }

    try {
      setMessage(
        "Saving your profile..."
      );

      const firebaseProfile: JobPilotProfile = {
        firstName:
          profile.firstName,

        lastName:
          profile.lastName,

        fullName:
          `${profile.firstName} ${profile.lastName}`.trim(),

        email:
          profile.email,

        phone:
          profile.phone,

        city:
          profile.location,

        linkedin:
          profile.linkedin,

        github:
          profile.github,

        portfolio:
          profile.portfolio,
      };

      /*
       * Save to Firestore.
       */

      await saveProfile(
        user.uid,
        firebaseProfile
      );

      /*
       * Also save locally so the
       * existing extension continues
       * working.
       */

      await chrome.storage.local.set({
        jobpilotProfile:
          profile,
      });

      setMessage(
        "Profile saved successfully."
      );
    } catch (error) {
      console.error(
        "Save profile error:",
        error
      );

      setMessage(
        "Could not save your profile."
      );
    }
  };

  /*
   * Get active browser tab.
   */

  const getActiveTab =
    async (): Promise<chrome.tabs.Tab> => {
      const tabs =
        await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

      if (!tabs[0]?.id) {
        throw new Error(
          "No active tab found."
        );
      }

      return tabs[0];
    };

  /*
   * Make sure content.js is available.
   */

  const ensureContentScript =
    async (
      tabId: number
    ): Promise<void> => {
      try {
        await chrome.tabs.sendMessage(
          tabId,
          {
            action: "ping",
          }
        );

        console.log(
          "JobPilot AI content script is already running."
        );
      } catch {
        console.log(
          "Content script not found. Injecting..."
        );

        await chrome.scripting.executeScript({
          target: {
            tabId,
          },

          files: [
            "content.js",
          ],
        });

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              100
            )
        );
      }
    };

  /*
   * Autofill application.
   */

  const autofill =
    async () => {
      if (!user) {
        setMessage(
          "Please sign in first."
        );

        return;
      }

      try {
        /*
         * Make sure the latest profile
         * is available locally.
         */

        await chrome.storage.local.set({
          jobpilotProfile:
            profile,
        });

        setMessage(
          "Connecting to the application..."
        );

        const tab =
          await getActiveTab();

        const tabId =
          tab.id;

        if (!tabId) {
          throw new Error(
            "Active tab has no ID."
          );
        }

        await ensureContentScript(
          tabId
        );

        await chrome.tabs.sendMessage(
          tabId,
          {
            action:
              "autofill",
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

  /*
   * Loading screen.
   */

  if (authLoading) {
    return (
      <div className="app">
        <h1>JobPilot AI</h1>

        <p className="subtitle">
          Loading...
        </p>
      </div>
    );
  }

  /*
   * LOGIN / REGISTER SCREEN
   */

  if (!user) {
    return (
      <div className="app">
        <h1>JobPilot AI</h1>

        <p className="subtitle">
          Your AI job application assistant
        </p>

        <div className="form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
          />
        </div>

        <button
          className="save-button"
          onClick={
            isRegistering
              ? handleRegister
              : handleLogin
          }
        >
          {isRegistering
            ? "Create Account"
            : "Login"}
        </button>

        <button
          className="autofill-button"
          onClick={() =>
            setIsRegistering(
              !isRegistering
            )
          }
        >
          {isRegistering
            ? "Already have an account? Login"
            : "Create a new account"}
        </button>

        {message && (
          <p className="message">
            {message}
          </p>
        )}
      </div>
    );
  }

  /*
   * LOGGED-IN PROFILE SCREEN
   */

  return (
    <div className="app">
      <h1>JobPilot AI</h1>

      <p className="subtitle">
        Your AI job application assistant
      </p>

      <p>
        Signed in as:
        <br />
        <strong>
          {user.email}
        </strong>
      </p>

      <div className="form">
        <input
          placeholder="First Name"
          value={
            profile.firstName
          }
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
          value={
            profile.lastName
          }
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
          value={
            profile.email
          }
          onChange={(e) =>
            setProfile({
              ...profile,
              email:
                e.target.value,
            })
          }
        />

        <input
          placeholder="Phone"
          value={
            profile.phone
          }
          onChange={(e) =>
            setProfile({
              ...profile,
              phone:
                e.target.value,
            })
          }
        />

        <input
          placeholder="Current City"
          value={
            profile.location
          }
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
          value={
            profile.linkedin
          }
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
          value={
            profile.github
          }
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
          value={
            profile.portfolio
          }
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
        onClick={
          handleSaveProfile
        }
      >
        Save Profile
      </button>

      <button
        className="autofill-button"
        onClick={
          autofill
        }
      >
        ✨ Autofill Application
      </button>

      <button
        className="autofill-button"
        onClick={
          handleLogout
        }
      >
        Logout
      </button>

      {message && (
        <p className="message">
          {message}
        </p>
      )}
    </div>
  );
}

/*
 * Convert Firebase errors into
 * user-friendly messages.
 */

function getAuthErrorMessage(
  error: unknown
): string {
  if (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error
  ) {
    const code =
      String(
        (
          error as {
            code: string;
          }
        ).code
      );

    switch (code) {
      case "auth/invalid-credential":
        return "Incorrect email or password.";

      case "auth/email-already-in-use":
        return "An account with this email already exists.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/weak-password":
        return "Password is too weak.";

      case "auth/user-not-found":
        return "No account exists with this email.";

      case "auth/wrong-password":
        return "Incorrect password.";

      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";

      default:
        return `Authentication error: ${code}`;
    }
  }

  return "Authentication failed.";
}

export default App;