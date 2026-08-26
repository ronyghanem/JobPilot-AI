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
  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [isRegistering, setIsRegistering] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [profile, setProfile] =
    useState<Profile>(emptyProfile);

  const [message, setMessage] =
    useState("");

  /*
   * --------------------------------------------------
   * Firebase authentication listener
   * --------------------------------------------------
   */

  useEffect(() => {
    const unsubscribe = watchAuth(
      async (firebaseUser) => {
        setUser(firebaseUser);

        if (!firebaseUser) {
          setProfile(emptyProfile);
          setAuthLoading(false);
          return;
        }

        try {
          /*
           * Load user's profile from Firestore.
           */

          const firebaseProfile =
            await getProfile(
              firebaseUser.uid
            );

          if (firebaseProfile) {
            const loadedProfile: Profile = {
              firstName:
                firebaseProfile.firstName || "",

              lastName:
                firebaseProfile.lastName || "",

              email:
                firebaseProfile.email ||
                firebaseUser.email ||
                "",

              phone:
                firebaseProfile.phone || "",

              location:
                firebaseProfile.city || "",

              linkedin:
                firebaseProfile.linkedin || "",

              github:
                firebaseProfile.github || "",

              portfolio:
                firebaseProfile.portfolio || "",
            };

            setProfile(
              loadedProfile
            );
          } else {
            /*
             * User exists in Authentication
             * but doesn't have a Firestore profile yet.
             */

            setProfile({
              ...emptyProfile,
              email:
                firebaseUser.email || "",
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

        setAuthLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /*
   * --------------------------------------------------
   * Login
   * --------------------------------------------------
   */

  const handleLogin = async () => {
    if (!email.trim()) {
      setMessage(
        "Please enter your email."
      );

      return;
    }

    if (!password) {
      setMessage(
        "Please enter your password."
      );

      return;
    }

    try {
      setMessage("Signing in...");

      await loginUser(
        email.trim(),
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
   * --------------------------------------------------
   * Register
   * --------------------------------------------------
   */

  const handleRegister = async () => {
    if (!email.trim()) {
      setMessage(
        "Please enter your email."
      );

      return;
    }

    if (!password) {
      setMessage(
        "Please enter a password."
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
        email.trim(),
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
   * --------------------------------------------------
   * Logout
   * --------------------------------------------------
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
   * --------------------------------------------------
   * Save profile to Firestore
   * --------------------------------------------------
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
          profile.firstName.trim(),

        lastName:
          profile.lastName.trim(),

        fullName:
          `${profile.firstName} ${profile.lastName}`
            .trim(),

        email:
          profile.email.trim(),

        phone:
          profile.phone.trim(),

        city:
          profile.location.trim(),

        linkedin:
          profile.linkedin.trim(),

        github:
          profile.github.trim(),

        portfolio:
          profile.portfolio.trim(),
      };

      /*
       * Save ONLY to Firebase.
       *
       * chrome.storage.local is intentionally
       * NOT used here because this is the web app.
       */

      await saveProfile(
        user.uid,
        firebaseProfile
      );

      setMessage(
        "Profile saved successfully."
      );
    } catch (error) {
      console.error(
        "Save profile error:",
        error
      );

      setMessage(
        getFirestoreErrorMessage(error)
      );
    }
  };

  /*
   * --------------------------------------------------
   * Loading screen
   * --------------------------------------------------
   */

  if (authLoading) {
    return (
      <div className="app">
        <h1>JobPilot AI</h1>

        <p className="subtitle">
          Your AI job application assistant
        </p>

        <p className="message">
          Loading...
        </p>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * Login / Register
   * --------------------------------------------------
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
            onChange={(e) => {
              setEmail(
                e.target.value
              );

              setMessage("");
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(
                e.target.value
              );

              setMessage("");
            }}
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
          onClick={() => {
            setIsRegistering(
              !isRegistering
            );

            setMessage("");
          }}
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
   * --------------------------------------------------
   * Logged-in profile
   * --------------------------------------------------
   */

  return (
    <div className="app">
      <h1>JobPilot AI</h1>

      <p className="subtitle">
        Your AI job application assistant
      </p>

      <div className="user-info">
        <p>
          Signed in as:
        </p>

        <strong>
          {user.email}
        </strong>
      </div>

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
          type="email"
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
          type="tel"
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
          type="url"
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
          type="url"
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
          type="url"
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
 * --------------------------------------------------
 * Firebase authentication errors
 * --------------------------------------------------
 */

function getAuthErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = String(
      (
        error as {
          code: string;
        }
      ).code
    );

    switch (code) {
      case "auth/invalid-credential":
        return (
          "Incorrect email or password."
        );

      case "auth/email-already-in-use":
        return (
          "An account with this email already exists."
        );

      case "auth/invalid-email":
        return (
          "Please enter a valid email address."
        );

      case "auth/weak-password":
        return (
          "Password is too weak."
        );

      case "auth/user-not-found":
        return (
          "No account exists with this email."
        );

      case "auth/wrong-password":
        return (
          "Incorrect password."
        );

      case "auth/too-many-requests":
        return (
          "Too many attempts. Please try again later."
        );

      case "auth/network-request-failed":
        return (
          "Network error. Please check your connection."
        );

      default:
        return (
          `Authentication error: ${code}`
        );
    }
  }

  return "Authentication failed.";
}

/*
 * --------------------------------------------------
 * Firestore errors
 * --------------------------------------------------
 */

function getFirestoreErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const code = String(
      (
        error as {
          code: string;
        }
      ).code
    );

    switch (code) {
      case "permission-denied":
        return (
          "Permission denied. Check your Firestore security rules."
        );

      case "unauthenticated":
        return (
          "Your session expired. Please log in again."
        );

      case "not-found":
        return (
          "Firestore database was not found."
        );

      case "failed-precondition":
        return (
          "Firestore is not configured correctly."
        );

      case "unavailable":
        return (
          "Firebase is temporarily unavailable. Try again."
        );

      default:
        return (
          `Firestore error: ${code}`
        );
    }
  }

  return "Could not save your profile.";
}

export default App;