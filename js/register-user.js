import { registerStaff } from './api.js';
import { saveUserSession } from './utils.js';
import { supabase } from './supabase-client.js';

// Staff accounts only. People who receive help are registered by staff inside an organization.

const registerForm = document.getElementById("register-form");

// Initialize intl-tel-input
const phoneInput = document.getElementById("phone-number");
const iti = window.intlTelInput(phoneInput, {
  initialCountry: "za",
  preferredCountries: ["za", "bw", "na", "sz", "ls", "zw", "mz"],
  utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@24.5.0/build/js/utils.js"
});

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Get full international number
    if (!iti.isValidNumber()) {
      alert("Please enter a valid phone number.");
      return;
    }
    const phoneNumber = iti.getNumber(); // e.g. +27821234567

    const email = document.getElementById("email").value.trim();
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      let accessToken;
      let authUserId;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        const msg = (signUpError.message || "").toLowerCase();
        const alreadyRegistered =
          msg.includes("already") ||
          msg.includes("registered") ||
          signUpError.status === 422;

        if (alreadyRegistered) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });

          if (signInError) throw signInError;
          if (!signInData.session) {
            throw new Error("Sign-in succeeded but no session was returned.");
          }

          accessToken = signInData.session.access_token;
          authUserId = signInData.user.id;
        } else {
          throw signUpError;
        }
      } else {
        if (!signUpData.session) {
          throw new Error("No session returned. Check that GOTRUE_MAILER_AUTOCONFIRM=true is set.");
        }
        accessToken = signUpData.session.access_token;
        authUserId = signUpData.user.id;
      }

      const data = await registerStaff({
        authUserId,
        firstName: document.getElementById("first-name").value.trim(),
        lastName: document.getElementById("last-name").value.trim(),
        email,
        phoneNumber
      }, accessToken);

      saveUserSession({
        userId: data.staffId,
        authUserId,
        token: accessToken,
        role: "staff"
      });

      window.location.href = "staff-dashboard.html";

    } catch (error) {
      console.error("Registration error:", error);
      alert(error.message || "Registration failed. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });

  // Password Visibility Toggle
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetInput = document.getElementById(this.getAttribute('data-target'));
      if (targetInput.type === 'password') {
        targetInput.type = 'text';
        this.textContent = 'Hide';
      } else {
        targetInput.type = 'password';
        this.textContent = 'Show';
      }
    });
  });
}
