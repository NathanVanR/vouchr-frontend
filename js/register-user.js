import { registerStaff, registerRecipient } from './api.js';
import { saveUserSession } from './utils.js';
import { supabase } from './supabase-client.js';

const registerForm = document.getElementById("register-form");
const roleInputs = document.querySelectorAll('input[name="role"]');
const recipientFields = document.getElementById("recipient-fields");

if (registerForm) {
  const toggleRoleFields = (role) => {
    const isRecipient = role === "recipient";
    if (recipientFields) {
      recipientFields.style.display = isRecipient ? "block" : "none";
      recipientFields.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.id === "unit-number" || field.id === "complex-name") {
          field.required = false;
        } else {
          field.required = isRecipient;
        }
        if (!isRecipient) field.value = "";
      });
    }
  };

  const initialRole = document.querySelector('input[name="role"]:checked')?.value || "recipient";
  toggleRoleFields(initialRole);

  roleInputs.forEach((input) => {
    input.addEventListener("change", (e) => toggleRoleFields(e.target.value));
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const selectedRole = document.querySelector('input[name="role"]:checked')?.value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      let accessToken;
      let authUserId;

      // ── 1. Auth: sign up, or sign in if the user already exists ──
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
          // Auth user exists from a previous partial registration → sign in
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
          throw new Error(
            "No session returned. Check that GOTRUE_MAILER_AUTOCONFIRM=true is set."
          );
        }
        accessToken = signUpData.session.access_token;
        authUserId = signUpData.user.id;
      }

      // ── 2. Create the domain profile (Spring) ────────────────────
      let data;

      if (selectedRole === "staff") {
        data = await registerStaff({
          authUserId,
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          email,
          phoneNumber: document.getElementById("phone-number").value.trim()
        }, accessToken);
      } else {
        data = await registerRecipient({
          authUserId,
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          email,
          saId: document.getElementById("sa-id").value.trim(),
          phoneNumber: document.getElementById("phone-number").value.trim(),
          address: {
            unitNumber: document.getElementById("unit-number")?.value.trim() || null,
            complexName: document.getElementById("complex-name")?.value.trim() || null,
            streetNumber: document.getElementById("street-number").value.trim(),
            streetName: document.getElementById("street-name").value.trim(),
            suburb: document.getElementById("suburb").value.trim(),
            city: document.getElementById("city").value.trim(),
            province: document.getElementById("province").value.trim()
          }
        }, accessToken);
      }

      // ── 3. Persist session and redirect ──────────────────────────
      saveUserSession({
        userId: data.recipientId || data.staffId,
        authUserId,
        token: accessToken,
        role: selectedRole
      });

      window.location.href = selectedRole === "staff"
        ? "staff-dashboard.html"
        : "recipient-dashboard.html";

    } catch (error) {
      console.error("Registration error:", error);
      alert(error.message || "Registration failed. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
}