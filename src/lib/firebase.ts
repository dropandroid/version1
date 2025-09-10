
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "studio-1645974412-65be1",
  "appId": "1:855459032530:web:6b5ddf932cc32fe1346c0b",
  "storageBucket": "studio-1645974412-65be1.firebasestorage.app",
  "apiKey": "AIzaSyCPbnR0W0sdzK3mag8ExH9qjE_HAlWIiLc",
  "authDomain": "studio-1645974412-65be1.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "855459032530"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);

export { app, auth };
