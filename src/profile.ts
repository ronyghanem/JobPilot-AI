import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export interface JobPilotProfile {
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

  cvFileName?: string;
}

export async function saveProfile(
  userId: string,
  profile: JobPilotProfile
): Promise<void> {
  const profileRef = doc(
    db,
    "users",
    userId
  );

  await setDoc(
    profileRef,
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}

export async function getProfile(
  userId: string
): Promise<JobPilotProfile | null> {
  const profileRef = doc(
    db,
    "users",
    userId
  );

  const snapshot =
    await getDoc(profileRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as JobPilotProfile;
}