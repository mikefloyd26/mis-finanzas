import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_mnrHw3c7uNQ4Hd-S641u54l6MQVe7Sc",
  authDomain: "kash-51260.firebaseapp.com",
  projectId: "kash-51260",
  storageBucket: "kash-51260.firebasestorage.app",
  messagingSenderId: "796652167640",
  appId: "1:796652167640:web:658395ce448d538aaa92ad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
