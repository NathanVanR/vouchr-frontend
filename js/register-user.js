import { registerStaff, registerRecipient } from './api.js';
import { saveUserSession } from './utils.js';
import { supabase } from './supabase-client.js';

const registerForm = document.getElementById("register-form");
const roleInputs = document.querySelectorAll('input[name="role"]');
const recipientFields = document.getElementById("recipient-fields");
const staffFields = document.getElementById("staff-fields");

// Dependent UI Logic
const dependentsList = document.getElementById("dependents-list");
const addDependentBtn = document.getElementById("add-dependent-btn");
let dependentIndex = 0;

if (addDependentBtn) {
  addDependentBtn.addEventListener("click", () => {
    const depId = `dep-${dependentIndex++}`;
    const depHtml = `
      <div class="dependent-group" id="${depId}" style="background: #f9f9f9; padding: 1rem; border-radius: 8px; border: 1px solid #eaeaea; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <strong style="font-size: 0.9rem;">Dependent</strong>
          <button type="button" class="btn text-link text-danger remove-dep-btn" data-target="${depId}" style="padding: 0; border: none; background: none; font-size: 0.85rem;">Remove</button>
        </div>
        <div class="form-group">
          <label>First name</label>
          <input type="text" name="dep-first-name" required>
        </div>
        <div class="form-group">
          <label>Last name</label>
          <input type="text" name="dep-last-name" required>
        </div>
        <div class="form-group">
          <label>SA ID number</label>
          <input type="text" name="dep-sa-id" pattern="[0-9]{13}" placeholder="13-digit ID number" required>
        </div>
      </div>
    `;
    dependentsList.insertAdjacentHTML("beforeend", depHtml);
  });
}

// Handle dynamic removal of dependent fields
if (dependentsList) {
  dependentsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-dep-btn")) {
      const targetId = e.target.getAttribute("data-target");
      document.getElementById(targetId).remove();
    }
  });
}

if (registerForm) {
  const toggleRoleFields = (role) => {
    const isRecipient = role === "recipient";
    const isStaff = role === "staff";
    
    if (recipientFields) {
      recipientFields.style.display = isRecipient ? "block" : "none";
      recipientFields.querySelectorAll("input, select, textarea").forEach((field) => {
        // Only enforce required on standard recipient fields, ignore dependents for this toggle
        if (!field.name.startsWith("dep-")) {
          if (field.id === "unit-number" || field.id === "complex-name") {
            field.required = false;
          } else {
            field.required = isRecipient;
          }
          if (!isRecipient) field.value = "";
        }
      });
      // Clear dependents if switching to staff
      if (!isRecipient && dependentsList) dependentsList.innerHTML = "";
    }

    if (staffFields) {
      staffFields.style.display = isStaff ? "block" : "none";
      staffFields.querySelectorAll("input, select, textarea").forEach((field) => {
        field.required = isStaff;
        if (!isStaff) field.value = "";
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

      let data;

      if (selectedRole === "staff") {
        data = await registerStaff({
          authUserId,
          firstName: document.getElementById("first-name").value.trim(),
          lastName: document.getElementById("last-name").value.trim(),
          email,
          phoneNumber: document.getElementById("phone-number").value.trim(),
          //organizationId: document.getElementById("organization-id").value.trim()
        }, accessToken);
      } else {
        
        // Extract dynamically added dependents
        const dependentNodes = document.querySelectorAll(".dependent-group");
        const dependentsArray = Array.from(dependentNodes).map(dep => ({
          firstName: dep.querySelector('input[name="dep-first-name"]').value.trim(),
          lastName: dep.querySelector('input[name="dep-last-name"]').value.trim(),
          saId: dep.querySelector('input[name="dep-sa-id"]').value.trim()
        }));

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
          },
          dependents: dependentsArray // Send to Spring Backend
        }, accessToken);
      }

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
  // Password Visibility Toggle Logic
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