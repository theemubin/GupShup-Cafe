import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDORRABIK1fPpreVGRNwwQbfTFMYH-cysM",
  authDomain: "efforts-celebrations.firebaseapp.com",
  projectId: "efforts-celebrations",
  storageBucket: "efforts-celebrations.firebasestorage.app",
  messagingSenderId: "14557716507",
  appId: "1:14557716507:web:9e751db40ebb133be358be",
  measurementId: "G-RJCDD0CB6D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
