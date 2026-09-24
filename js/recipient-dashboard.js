import { getRecipientVouchers } from './api.js';
import { getStoredUser, formatCurrency, formatDate } from './utils.js';

async function loadRecipientDashboard() {
  const voucherListContainer = document.getElementById("voucher-list-container");
  if (!voucherListContainer) return;

  const { userId } = getStoredUser();
  const statCount = document.getElementById("stat-active-count");
  const statTotal = document.getElementById("stat-total-value");

  if (!userId) {
    voucherListContainer.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem 1rem; width: 100%;">
        <h3>No session found</h3>
        <p class="muted">Please <a href="login.html" class="text-link">sign in</a> to view your active vouchers.</p>
      </div>
    `;
    return;
  }

  try {
    const vouchers = await getRecipientVouchers(userId);
    const activeVouchers = Array.isArray(vouchers)
      ? vouchers.filter((v) => v.status === "ACTIVE")
      : [];

    if (statCount) statCount.textContent = activeVouchers.length;
    if (statTotal) {
      const totalValue = activeVouchers.reduce((acc, v) => acc + (v.remainingAmount || v.amount || 0), 0);
      statTotal.textContent = formatCurrency(totalValue);
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
        <p class="voucher-amount">${formatCurrency(v.remainingAmount || v.amount)} remaining</p>
        <div class="voucher-meta">
          <span>Expires ${formatDate(v.expiryDate)}</span>
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

document.addEventListener("DOMContentLoaded", loadRecipientDashboard);