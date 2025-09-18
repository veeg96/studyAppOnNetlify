document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show active content
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Login form submission
  const loginForm = document.getElementById('login-button');
  loginForm.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!username || !password) {
      errorElement.textContent = 'Please enter both username and password';
      return;
    }
    
    try {
      const response = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store session token
      localStorage.setItem('sessionToken', data.token);
      localStorage.setItem('username', username);
      
      // Redirect to main app
      window.location.href = '/index.html';
    } catch (error) {
      errorElement.textContent = error.message;
    }
  });
  
  // Registration form submission
  const registerForm = document.getElementById('register-button');
  registerForm.addEventListener('click', async () => {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const errorElement = document.getElementById('register-error');
    
    if (!username || !password || !confirmPassword) {
      errorElement.textContent = 'Please fill in all fields';
      return;
    }
    
    if (password !== confirmPassword) {
      errorElement.textContent = 'Passwords do not match';
      return;
    }
    
    try {
      const response = await fetch('/.netlify/functions/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // Show success message and switch to login tab
      errorElement.textContent = '';
      document.getElementById('register-username').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-confirm').value = '';
      
      // Switch to login tab
      tabs[0].click();
      document.getElementById('login-username').value = username;
      document.getElementById('login-error').textContent = 'Registration successful! You can now log in.';
    } catch (error) {
      errorElement.textContent = error.message;
    }
  });
  
  // Check if already logged in
  const sessionToken = localStorage.getItem('sessionToken');
  if (sessionToken) {
    // Redirect to main app if already logged in
    window.location.href = '/index.html';
  }
});
