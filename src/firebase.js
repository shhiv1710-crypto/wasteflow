import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDCgNIe96GLCa2ctdIhlBsUMkzrPfvjHfY",
  authDomain: "wasteflow-3ad55.firebaseapp.com",
  projectId: "wasteflow-3ad55",
  storageBucket: "wasteflow-3ad55.firebasestorage.app",
  messagingSenderId: "200155177828",
  appId: "1:200155177828:web:ffe493799c60fb2f9d071"
};

const app = initializeApp(firebaseConfig);
console.log("FIREBASE PROJECT:", firebaseConfig.projectId);
console.log("FIREBASE API KEY:", firebaseConfig.apiKey);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();