// Vouchr — basic client-side behavior
// Ready for Firebase Authentication integration later

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      // Placeholder — replace with Firebase Auth
      // firebase.auth().signInWithEmailAndPassword(email, password)...

      if (!email || !password) {
        alert("Please enter email and password.");
        return;
      }

      // Demo: simple mock redirect based on email hint
      // In production this would come from the user profile / claims
      console.log("Login attempt:", { email });

      if (email.toLowerCase().includes("staff") || email.toLowerCase().includes("org") || email.toLowerCase().includes("admin")) {
        window.location.href = "employee.html";
      } else {
        window.location.href = "recipient.html";
      }
    });
  }

  // Filter buttons on employee dashboard (visual only for now)
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      // Future: filter table rows by status
    });
  });

  // Voucher redeem buttons (placeholder)
  document.querySelectorAll(".voucher-card .btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".voucher-card");
      const code = card.querySelector(".voucher-meta span:last-child")?.textContent || "voucher";
      alert(`Redeem flow for ${code}\n\n(QR code / partner terminal integration coming soon)`);
    });
  });
});
