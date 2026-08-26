import { registerUser } from "./firebaseAuth";

export async function testFirebase() {
  try {
    const user = await registerUser(
      "test-jobpilot@example.com",
      "TestPassword123!"
    );

    console.log(
      "Firebase authentication successful:",
      user.uid
    );
  } catch (error) {
    console.error(
      "Firebase authentication failed:",
      error
    );
  }
}