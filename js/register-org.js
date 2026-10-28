// js/register-org.js
import { createOrganization } from './api.js';
import { getStoredUser, saveUserSession, normaliseStreetAddress, isValidStreetAddress, attachStreetAddressValidation, STREET_ADDRESS_MESSAGE } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-org-form');
  if (!form) return;

  attachStreetAddressValidation(document.getElementById('org-street-address'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const streetInput = document.getElementById('org-street-address');
    if (!isValidStreetAddress(streetInput.value)) {
      streetInput.setCustomValidity(STREET_ADDRESS_MESSAGE);
      streetInput.reportValidity();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    const formData = new FormData(form);

    const payload = {
      name: formData.get('org-name'),
      orgType: formData.get('org-type').toUpperCase(),
      orgCapability: formData.get('org-capability'),
      email: formData.get('org-email') || null,
      phoneNumber: formData.get('org-phone') || null,
    };

    const unitNumber = formData.get('org-unit-number');
    const complexName = formData.get('org-complex-name');
    const streetAddress = normaliseStreetAddress(formData.get('org-street-address'));
    const suburb = formData.get('org-suburb');
    const city = formData.get('org-city');
    const province = formData.get('org-province');

    if (unitNumber || complexName || streetAddress || suburb || city || province) {
      payload.address = {
        unitNumber: unitNumber || null,
        complexName: complexName || null,
        streetAddress: streetAddress || null,
        suburb: suburb || null,
        city: city || null,
        province: province || null
      };
    }

    try {
      const created = await createOrganization(payload);

      // Update local storage with the new organization
      const currentOrgs = getStoredUser().userOrganizations || {};
      currentOrgs[created.organizationId] = {
        name: created.name,
        role: "ROLE_ORG_ADMIN"          // creator becomes the admin
      };

      saveUserSession({ organizations: currentOrgs });

      // Optional but recommended: set it as the active org
      localStorage.setItem("activeOrgId", created.organizationId);

      window.location.href = 'staff-dashboard.html';
    } catch (error) {
      console.error('Error creating organization:', error);
      alert(`Failed to create organization: ${error.message}`);

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});