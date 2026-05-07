import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB21VCwxv3xbDlL5LfdD0XrMYwEpSav2Tk",
  authDomain: "ips-isp.firebaseapp.com",
  projectId: "ips-isp",
  storageBucket: "ips-isp.firebasestorage.app",
  messagingSenderId: "954288818895",
  appId: "1:954288818895:web:3932193bfc493e5e92c5ba",
  measurementId: "G-GCFP7C114J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
