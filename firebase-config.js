import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCphq1ZEEyvP7tSUlIJtuL58DnO7aYNejs",
  authDomain: "invoicepro-6d238.firebaseapp.com",
  projectId: "invoicepro-6d238",
  storageBucket: "invoicepro-6d238.firebasestorage.app",
  messagingSenderId: "772639544763",
  appId: "1:772639544763:web:feda0393117bdb5037e09e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

