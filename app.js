// app.js
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {

  // ——— Registration ———
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullName = document.getElementById("full-name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      const role = document.querySelector('input[name="role"]:checked')?.value || "recipient";

      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Save display name
        await updateProfile(userCredential.user, {
          displayName: fullName
        });

        // Temporarily store role in localStorage.
        // Later we will move this to your Spring API / database.
        localStorage.setItem("vouchr_role", role);
        localStorage.setItem("vouchr_name", fullName);

        // Redirect
        window.location.href = role === "staff" ? "employee.html" : "recipient.html";
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });
  }

  // ——— Login ———
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try {
        await signInWithEmailAndPassword(auth, email, password);

        const role = localStorage.getItem("vouchr_role") || "recipient";
        window.location.href = role === "staff" ? "employee.html" : "recipient.html";
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });
  }

  // ——— Logout ———
  document.querySelectorAll('a[href="login.html"]').forEach(link => {
    if (link.textContent.toLowerCase().includes("log out")) {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        await signOut(auth);
        localStorage.removeItem("vouchr_role");
        localStorage.removeItem("vouchr_name");
        window.location.href = "login.html";
      });
    }
  });
});