import { registerStaff, registerRecipient } from './api.js';
import { saveUserSession } from './utils.js';

// Top-level DOM selection (safe in type="module")
const registerForm = document.getElementById("register-form");
const roleInputs = document.querySelectorAll('input[name="role"]');
const recipientFields = document.getElementById("recipient-fields");

if (registerForm) {
  const toggleRoleFields = (role) => {
    const isRecipient = role === "recipient";

    // Toggle Recipient Section
    if (recipientFields) {
      recipientFields.style.display = isRecipient ? "block" : "none";
      recipientFields.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.id === "unit-number" || field.id === "complex-name") {
          field.required = false;
        } else {
          field.required = isRecipient;
        }
        if (!isRecipient) field.value = ""; // Clear values when hidden
      });
    }
  };

  // Initialize view based on default checked radio
  const initialRole = document.querySelector('input[name="role"]:checked')?.value || "recipient";
  toggleRoleFields(initialRole);

  // Attach change listeners to radio buttons
  roleInputs.forEach((input) => {
    input.addEventListener("change", (e) => toggleRoleFields(e.target.value));
  });

  // Handle form submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const selectedRole = document.querySelector('input[name="role"]:checked')?.value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      let data;

      if (selectedRole === "staff") {
        data = await registerStaff({
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          email: document.getElementById("email").value.trim(),
          phoneNumber: document.getElementById("phone-number").value.trim(),
          password
        });
      } else {
        data = await registerRecipient({
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          email: document.getElementById("email").value.trim(),
          password,
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
        });
      }

      const userId = data.id || data.userId || data.staffId || data.recipientId;
      saveUserSession({
        userId,
        token: data.token,
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