import { supabase } from './supabase-client.js';
import { saveUserSession } from './utils.js';

const API_BASE_URL = window.VOUCHR_CONFIG.apiBaseUrl;

const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const accessToken = data.session.access_token;
      const authUserId = data.user.id;

      const meResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!meResponse.ok) {
        if (meResponse.status === 404 || meResponse.status === 403) {
          alert('Account found but profile is incomplete. Please finish registration.');
          window.location.href = 'register-user.html';
          return;
        }
        throw new Error('Could not load user profile');
      }

      const profile = await meResponse.json();

      saveUserSession({
        token: accessToken,
        authUserId,
        userId: profile.profileId,
        role: profile.role.toLowerCase()
      });

      if (profile.role === 'STAFF') {
        window.location.href = 'staff-dashboard.html';
      } else {
        window.location.href = 'recipient-dashboard.html';
      }

    } catch (err) {
      console.error('Login error:', err);
      alert(err.message || 'Login failed. Please check your credentials.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
}