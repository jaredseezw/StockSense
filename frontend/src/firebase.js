import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOcs-zlWqoAAlgPsT0EgnyBrSoeGAv3dw",
  authDomain: "stocksenseorbital.firebaseapp.com",
  projectId: "stocksenseorbital",
  storageBucket: "stocksenseorbital.firebasestorage.app",
  messagingSenderId: "184966027100",
  appId: "1:184966027100:web:a120ac148940331d775399"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);