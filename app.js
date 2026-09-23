document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const recipientFields = document.getElementById("recipient-fields");

  // Read the API base URL from window.VOUCHR_CONFIG (fallback to port 8081)
  const API_BASE_URL = window.VOUCHR_CONFIG?.apiBaseUrl || "http://localhost:8081";

  // Toggle recipient-specific input requirements
  const toggleRecipientFields = (role) => {
    if (!recipientFields) return;
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
  if (registerForm) {
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
        let endpoint = "";
        let payload = {};

        if (selectedRole === "staff") {
          // Matched to @RequestMapping("/api/users") + @PostMapping("/staff")
          endpoint = `${API_BASE_URL}/api/users/staff`;
          payload = {
            firstName: document.getElementById("first-name").value,
            lastName: document.getElementById("last-name").value,
            email: document.getElementById("email").value,
            password: password
          };
        } else {
          // Matched to @RequestMapping("/api/users") + @PostMapping("/recipient")
          endpoint = `${API_BASE_URL}/api/users/recipient`;
          payload = {
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
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 201 || response.ok) {
          console.log(`${selectedRole} created successfully:`, data);

          if (selectedRole === "staff") {
            alert("Staff account created successfully! You can now log in.");
            window.location.href = "login.html";
          } else {
            // Save returned user identity for recipient dashboard
            const recipientId = data.id || data.userId || data.recipientId;
            if (recipientId) {
              localStorage.setItem("userId", recipientId);
            }
            if (data.token) {
              localStorage.setItem("authToken", data.token);
            }
            window.location.href = "recipient-dashboard.html";
          }
        } else {
          alert(`Registration failed: ${data.error || data.message || response.statusText}`);
        }
      } catch (error) {
        console.error("Network error:", error);
        alert("Unable to connect to server. Please ensure the backend is running and CORS allows origin http://127.0.0.1:5500.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
      }
    });
  }
});

// Voucher Dashboard Handler
async function loadRecipientDashboard() {
  const voucherListContainer = document.getElementById("voucher-list-container");
  if (!voucherListContainer) return;

  const recipientId = localStorage.getItem("userId");
  const API_BASE_URL = window.VOUCHR_CONFIG?.apiBaseUrl || "http://localhost:8081";

  const statCount = document.getElementById("stat-active-count");
  const statTotal = document.getElementById("stat-total-value");

  if (!recipientId) {
    voucherListContainer.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem 1rem; width: 100%;">
        <h3>No session found</h3>
        <p class="muted">Please <a href="login.html" class="text-link">sign in</a> to view your active vouchers.</p>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/vouchers/recipient/${recipientId}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("authToken") || ""}`
      }
    });

    if (!response.ok) throw new Error("Failed to fetch vouchers");

    const vouchers = await response.json();
    const activeVouchers = Array.isArray(vouchers) ? vouchers.filter((v) => v.status === "ACTIVE") : [];

    if (statCount) statCount.textContent = activeVouchers.length;
    if (statTotal) {
      const totalValue = activeVouchers.reduce((acc, v) => acc + (v.remainingAmount || v.amount || 0), 0);
      statTotal.textContent = `R ${totalValue.toLocaleString("en-ZA")}`;
    }

    if (activeVouchers.length === 0) {
      voucherListContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem 1rem; width: 100%;">
          <h3>No active vouchers found</h3>
          <p class="muted">When an organization issues a voucher to your registered phone or ID, it will appear here automatically.</p>
        </div>
      `;
      return;
    }

    voucherListContainer.innerHTML = activeVouchers.map((v) => `
      <article class="voucher-card">
        <div class="voucher-top">
          <span class="voucher-org">${v.organizationName || "Partner NPO"}</span>
          <span class="badge badge-active">${v.status}</span>
        </div>
        <h3>${v.categoryName || "General Essentials"}</h3>
        <p class="voucher-amount">R ${v.remainingAmount || v.amount} remaining</p>
        <div class="voucher-meta">
          <span>Expires ${v.expiryDate ? new Date(v.expiryDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</span>
          <span>Code: ${v.code}</span>
        </div>
        <button class="btn btn-primary btn-sm">Show QR / Redeem</button>
      </article>
    `).join("");

  } catch (error) {
    console.error("Error loading dashboard:", error);
    voucherListContainer.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 2rem; width: 100%;">
        <p class="muted">Could not load active vouchers. Please try again later.</p>
      </div>
    `;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadRecipientDashboard);
} else {
  loadRecipientDashboard();
}