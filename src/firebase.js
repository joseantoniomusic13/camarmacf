// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAAQjyX6LVadp5Sl6m6H4jE9FHnSmpkoxI",
  authDomain: "camarmacf-b3088.firebaseapp.com",
  databaseURL: "https://camarmacf-b3088-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "camarmacf-b3088",
  storageBucket: "camarmacf-b3088.firebasestorage.app",
  messagingSenderId: "818577789876",
  appId: "1:818577789876:web:cc176f8f53f9c5227718e1",
  measurementId: "G-C1JR0XTBEB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios listos para usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);