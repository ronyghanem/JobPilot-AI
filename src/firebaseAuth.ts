import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "./firebase";

export async function registerUser(
  email: string,
  password: string
): Promise<User> {
  const result =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  return result.user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  const result =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function watchAuth(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(
    auth,
    callback
  );
}