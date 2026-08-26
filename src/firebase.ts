import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgfvmDnXFjbVrKaCwNpKTBZ6nwbqMPnVA",
  authDomain: "jobpilot-ai-6793d.firebaseapp.com",
  projectId: "jobpilot-ai-6793d",
  messagingSenderId: "525849819472",
  appId: "1:525849819472:web:ededdc75bffe0903005455",
};

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;