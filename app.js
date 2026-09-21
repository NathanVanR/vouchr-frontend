document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const recipientFields = document.getElementById("recipient-fields");

  // Read the API base URL from window.VOUCHR_CONFIG (fallback to port 8081)
  const API_BASE_URL = window.VOUCHR_CONFIG?.apiBaseUrl || "http://localhost:8081";

  // Toggle recipient-specific input requirements
  const toggleRecipientFields = (role) => {
    const isRecipient = role === "recipient";
    recipientFields.style.display = isRecipient ? "block" : "none";

    recipientFields.querySelectorAll("input").forEach((field) => {
      // Keep optional address fields non-required
      if (field.id === "unit-number" || field.id === "complex-name") {
        field.required = false;
      } else {
        field.required = isRecipient;
      }

      if (!isRecipient) {
        field.value = "";
      }
    });
  };

  const initialRole = document.querySelector('input[name="role"]:checked')?.value || "recipient";
  toggleRecipientFields(initialRole);

  roleInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      toggleRecipientFields(e.target.value);
    });
  });

  // Handle Form Submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const selectedRole = document.querySelector('input[name="role"]:checked').value;

    if (selectedRole === "staff") {
      alert("Staff registration is managed directly by organization administrators. Redirecting to staff portal...");
      window.location.href = "login.html";
      return;
    }

    // Construct Payload directly from new HTML inputs
    const payload = {
      firstName: document.getElementById("first-name").value,
      lastName: document.getElementById("last-name").value,
      email: document.getElementById("email").value,
      password: password,
      saId: document.getElementById("sa-id").value,
      phoneNumber: document.getElementById("phone-number").value,
      address: {
        unitNumber: document.getElementById("unit-number").value || null,
        complexName: document.getElementById("complex-name").value || null,
        streetNumber: document.getElementById("street-number").value,
        streetName: document.getElementById("street-name").value,
        suburb: document.getElementById("suburb").value,
        city: document.getElementById("city").value,
        province: document.getElementById("province").value
      }
    };

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/recipient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 201 || response.ok) {
        const data = await response.json();
        console.log("Recipient created successfully:", data);
        window.location.href = "login.html";
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Registration failed: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Unable to connect to server. Please try again later.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
});