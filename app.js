(() => {
  'use strict';

  const STORAGE_KEYS = {
    USERS: 'app_users_db',
    SESSION: 'app_active_session'
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const EYE_OPEN_SVG = `
    <svg class="eye-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  const EYE_CLOSED_SVG = `
    <svg class="eye-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `;

  const screens = {
    login: document.getElementById('login-screen'),
    register: document.getElementById('register-screen'),
    dashboard: document.getElementById('dashboard-screen')
  };

  const forms = {
    login: document.getElementById('login-form'),
    register: document.getElementById('register-form')
  };

  const dashboardElements = {
    avatar: document.getElementById('user-avatar'),
    name: document.getElementById('dashboard-name'),
    email: document.getElementById('dashboard-email'),
    sessionType: document.getElementById('dashboard-session-type'),
    logoutBtn: document.getElementById('logout-btn')
  };

  const StorageService = {
    getUsers() {
      try {
        const rawData = localStorage.getItem(STORAGE_KEYS.USERS);
        return rawData ? JSON.parse(rawData) : [];
      } catch {
        return [];
      }
    },

    saveUsers(users) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    },

    findUserByEmail(email) {
      const normalizedEmail = email.trim().toLowerCase();
      return this.getUsers().find((user) => user.email.toLowerCase() === normalizedEmail) || null;
    },

    addUser(userData) {
      const users = this.getUsers();
      users.push(userData);
      this.saveUsers(users);
    },

    createSession(user, rememberMe) {
      const sessionPayload = JSON.stringify({
        name: user.name,
        email: user.email,
        persistent: rememberMe
      });

      this.clearSession();

      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.SESSION, sessionPayload);
      } else {
        sessionStorage.setItem(STORAGE_KEYS.SESSION, sessionPayload);
      }
    },

    getActiveSession() {
      try {
        const localSession = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (localSession) {
          return JSON.parse(localSession);
        }

        const tempSession = sessionStorage.getItem(STORAGE_KEYS.SESSION);
        if (tempSession) {
          return JSON.parse(tempSession);
        }

        return null;
      } catch {
        return null;
      }
    },

    clearSession() {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  };

  const UIHelper = {
    setFieldError(inputId, message) {
      const inputEl = document.getElementById(inputId);
      const errorEl = document.getElementById(`${inputId}-error`);

      if (inputEl) {
        inputEl.classList.add('is-invalid');
      }
      if (errorEl) {
        errorEl.textContent = message;
      }
    },

    clearFieldError(inputId) {
      const inputEl = document.getElementById(inputId);
      const errorEl = document.getElementById(`${inputId}-error`);

      if (inputEl) {
        inputEl.classList.remove('is-invalid');
      }
      if (errorEl) {
        errorEl.textContent = '';
      }
    },

    clearFormErrors(formElement) {
      const inputs = formElement.querySelectorAll('.form-input');
      inputs.forEach((input) => this.clearFieldError(input.id));
    },

    resetPasswordVisibility(formElement) {
      const toggleButtons = formElement.querySelectorAll('.toggle-password');
      toggleButtons.forEach((btn) => {
        const targetInput = document.getElementById(btn.dataset.target);
        if (targetInput) {
          targetInput.type = 'password';
        }
        btn.classList.remove('is-visible');
        btn.innerHTML = EYE_OPEN_SVG;
      });
    },

    renderDashboard(session) {
      dashboardElements.name.textContent = session.name;
      dashboardElements.email.textContent = session.email;
      dashboardElements.avatar.textContent = session.name.trim().charAt(0).toUpperCase() || 'U';
      dashboardElements.sessionType.textContent = session.persistent
        ? 'Постоянная (localStorage)'
        : 'Временная (sessionStorage)';
    }
  };

  function navigateTo(targetScreen) {
    const activeSession = StorageService.getActiveSession();

    if (targetScreen === 'dashboard' && !activeSession) {
      targetScreen = 'login';
    }

    if ((targetScreen === 'login' || targetScreen === 'register') && activeSession) {
      targetScreen = 'dashboard';
    }

    Object.entries(screens).forEach(([key, section]) => {
      if (key === targetScreen) {
        section.hidden = false;
        section.classList.remove('active');
        void section.offsetWidth;
        section.classList.add('active');
      } else {
        section.hidden = true;
        section.classList.remove('active');
      }
    });

    if (targetScreen === 'dashboard' && activeSession) {
      UIHelper.renderDashboard(activeSession);
    }

    if (targetScreen === 'login') {
      forms.login.reset();
      UIHelper.clearFormErrors(forms.login);
      UIHelper.resetPasswordVisibility(forms.login);
    }

    if (targetScreen === 'register') {
      forms.register.reset();
      UIHelper.clearFormErrors(forms.register);
      UIHelper.resetPasswordVisibility(forms.register);
    }
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    UIHelper.clearFormErrors(forms.register);

    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    let isValid = true;

    if (!name) {
      UIHelper.setFieldError('register-name', 'Введите ваше имя');
      isValid = false;
    } else if (name.length < 2) {
      UIHelper.setFieldError('register-name', 'Имя должно содержать минимум 2 символа');
      isValid = false;
    }

    if (!email) {
      UIHelper.setFieldError('register-email', 'Введите Email');
      isValid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      UIHelper.setFieldError('register-email', 'Некорректный формат Email');
      isValid = false;
    } else if (StorageService.findUserByEmail(email)) {
      UIHelper.setFieldError('register-email', 'Пользователь с таким Email уже зарегистрирован');
      isValid = false;
    }

    if (!password) {
      UIHelper.setFieldError('register-password', 'Введите пароль');
      isValid = false;
    } else if (password.length < 6) {
      UIHelper.setFieldError('register-password', 'Пароль должен быть не менее 6 символов');
      isValid = false;
    }

    if (!confirmPassword) {
      UIHelper.setFieldError('register-confirm-password', 'Подтвердите пароль');
      isValid = false;
    } else if (password !== confirmPassword) {
      UIHelper.setFieldError('register-confirm-password', 'Пароли не совпадают');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email: email.toLowerCase(),
      password
    };

    StorageService.addUser(newUser);
    StorageService.createSession(newUser, true);
    navigateTo('dashboard');
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    UIHelper.clearFormErrors(forms.login);

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const rememberMeInput = document.getElementById('remember-me');

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeInput.checked;

    let isValid = true;

    if (!email) {
      UIHelper.setFieldError('login-email', 'Введите Email');
      isValid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      UIHelper.setFieldError('login-email', 'Некорректный формат Email');
      isValid = false;
    }

    if (!password) {
      UIHelper.setFieldError('login-password', 'Введите пароль');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    const existingUser = StorageService.findUserByEmail(email);

    if (!existingUser) {
      UIHelper.setFieldError('login-email', 'Пользователь с таким Email не найден');
      return;
    }

    if (existingUser.password !== password) {
      UIHelper.setFieldError('login-password', 'Неверный пароль');
      return;
    }

    StorageService.createSession(existingUser, rememberMe);
    navigateTo('dashboard');
  }

  function handleLogout() {
    StorageService.clearSession();
    navigateTo('login');
  }

  function initEventListeners() {
    forms.register.addEventListener('submit', handleRegisterSubmit);
    forms.login.addEventListener('submit', handleLoginSubmit);
    dashboardElements.logoutBtn.addEventListener('click', handleLogout);

    document.querySelectorAll('[data-navigate]').forEach((button) => {
      button.addEventListener('click', () => {
        navigateTo(button.dataset.navigate);
      });
    });document.querySelectorAll('.toggle-password').forEach((button) => {
button.addEventListener('click', () => {
const targetInput = document.getElementById(button.dataset.target);
if (!targetInput) {
return;
}
const isPassword = targetInput.type === 'password';
targetInput.type = isPassword ? 'text' : 'password';
button.classList.toggle('is-visible', isPassword);
button.innerHTML = isPassword ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
});
});
document.querySelectorAll('.form-input').forEach((input) => {
input.addEventListener('input', () => {
if (input.classList.contains('is-invalid')) {
UIHelper.clearFieldError(input.id);
}
});
});
}
function initApp() {
initEventListeners();
const activeSession = StorageService.getActiveSession();
if (activeSession) {
navigateTo('dashboard');
} else {
navigateTo('login');
}
}
initApp();
})();