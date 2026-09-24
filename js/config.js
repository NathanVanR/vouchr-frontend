// config.js
// Values will later be injected by Google Cloud / your build process.
// For local development just edit this file.

const VOUCHR_CONFIG = {
  firebase: {
    apiKey: "AIzaSyDMQTY1bzXc3aqTqLT2ThnpR63Glb_qFx8",
    authDomain: "vouchr-4749c.firebaseapp.com",
    projectId: "vouchr-4749c",
    storageBucket: "vouchr-4749c.firebasestorage.app",
    messagingSenderId: "39348059822",
    appId: "1:39348059822:web:85b8ae22b423fb7163f73f",
    measurementId: "G-WSF72F8574"
  },
  //apiBaseUrl: "http://localhost:8081"
  apiBaseUrl: "https://vouchr-backend-39348059822.africa-south1.run.app"
};

// Keep it on the window object if your external build tools need it
window.VOUCHR_CONFIG = VOUCHR_CONFIG;

// Add these exports so api.js can successfully import them!
export const API_BASE_URL = VOUCHR_CONFIG.apiBaseUrl;
export const firebaseConfig = VOUCHR_CONFIG.firebase;