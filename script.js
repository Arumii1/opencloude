const $ = (id) => document.getElementById(id);

// Вікна
const loginPage = $("loginPage");
const registerPage = $("registerPage");
const forgotPage = $("forgotPage");

// Повідомлення
const loginMessage = $("loginMessage");
const registerMessage = $("registerMessage");
const recoveryMessage = $("recoveryMessage");

// Форми
const loginForm = $("loginForm");
const registerForm = $("registerForm");
const recoveryForm = $("recoveryForm");
const verifyForm = $("verifyForm");
const newPasswordForm = $("newPasswordForm");

// Допоміжні функції
function showMessage(element, text, success = false) {
    element.textContent = text;
    element.style.color = success ? "green" : "crimson";
}

function clearMessages() {
    [loginMessage, registerMessage, recoveryMessage].forEach((el) => {
        el.textContent = "";
    });
}

function showAuthPage(page) {
    loginPage.hidden = page !== "login";
    registerPage.hidden = page !== "register";
    forgotPage.hidden = page !== "forgot";

    clearMessages();
}

function normalizePhone(phone) {
    return phone.replace(/[\s()-]/g, "");
}

function getUsers() {
    try {
        const users = JSON.parse(localStorage.getItem("demoUsers") || "[]");
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem("demoUsers", JSON.stringify(users));
}

function findUser(identifier) {
    const value = identifier.trim().toLowerCase();
    const phone = normalizePhone(identifier);

    return getUsers().find((user) =>
        user.email.toLowerCase() === value ||
        normalizePhone(user.phone) === phone
    );
}

// Перехід між вікнами
$("openRegister").addEventListener("click", () => {
    registerForm.reset();
    showAuthPage("register");
});

$("backToLogin").addEventListener("click", () => {
    loginForm.reset();
    showAuthPage("login");
});

$("forgotButton").addEventListener("click", () => {
    recoveryForm.reset();
    verifyForm.reset();
    newPasswordForm.reset();

    verifyForm.hidden = true;
    newPasswordForm.hidden = true;

    showAuthPage("forgot");
});

$("backFromRecovery").addEventListener("click", () => {
    recoveryForm.reset();
    verifyForm.reset();
    newPasswordForm.reset();

    verifyForm.hidden = true;
    newPasswordForm.hidden = true;

    showAuthPage("login");
});

// РЕЄСТРАЦІЯ
registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const firstName = $("firstName").value.trim();
    const lastName = $("lastName").value.trim();
    const email = $("registerEmail").value.trim().toLowerCase();
    const phone = normalizePhone($("registerPhone").value);
    const password = $("registerPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (password.length < 8) {
        showMessage(registerMessage, "Пароль має містити щонайменше 8 символів.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage(registerMessage, "Паролі не збігаються.");
        return;
    }

    const users = getUsers();

    const alreadyExists = users.some((user) =>
        user.email.toLowerCase() === email ||
        normalizePhone(user.phone) === phone
    );

    if (alreadyExists) {
        showMessage(registerMessage, "Ця пошта або телефон уже зареєстровані.");
        return;
    }

    // Тільки для навчальної демонстрації!
    // У реальному проєкті пароль хешується на сервері.
    users.push({
        firstName,
        lastName,
        email,
        phone,
        password
    });

    saveUsers(users);

    registerForm.reset();
    loginForm.reset();

    showAuthPage("login");
    showMessage(loginMessage, "Реєстрація успішна! Тепер можете увійти.", true);
});

// ВХІД
loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const identifier = $("loginIdentifier").value.trim();
    const password = $("loginPassword").value;

    const user = findUser(identifier);

    if (!user || user.password !== password) {
        showMessage(loginMessage, "Неправильна пошта, телефон або пароль.");
        return;
    }

    showMessage(
        loginMessage,
        `Вітаємо, ${user.firstName}! Ви успішно увійшли.`,
        true
    );

    // Перехід до порталу після успішного демонстраційного входу.
    document.body.classList.remove("auth-mode");
    document.body.classList.add("portal-mode");
    document.querySelector(".container").hidden = true;
    document.querySelector(".app").hidden = false;

    // Підставляємо дані користувача в профіль.
    $("first-name").value = user.firstName || "";
    $("last-name").value = user.lastName || "";
    $("phone").value = user.phone || "";
    $("email").value = user.email || "";
    updateProfilePreview();
});

// ЗАПИТ НА ВІДНОВЛЕННЯ ПАРОЛЯ
let recoveryUser = null;
let demoCode = null;
let codeExpiresAt = 0;
let attemptsLeft = 0;
let verified = false;

recoveryForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const identifier = $("recoveryIdentifier").value.trim();
    const user = findUser(identifier);

    if (!user) {
        showMessage(
            recoveryMessage,
            "Не вдалося знайти акаунт із такими даними."
        );
        return;
    }

    recoveryUser = user;

    // ДЕМО: не надсилає SMS чи email.
    // У справжній системі код створює та надсилає сервер.
    demoCode = String(Math.floor(100000 + Math.random() * 900000));
    codeExpiresAt = Date.now() + 5 * 60 * 1000;
    attemptsLeft = 5;
    verified = false;

    verifyForm.reset();
    newPasswordForm.reset();

    verifyForm.hidden = false;
    newPasswordForm.hidden = true;

    showMessage(
        recoveryMessage,
        `ДЕМО-КОД: ${demoCode}. У реальній системі він має надходити SMS або на пошту.`,
        true
    );
});

// ПЕРЕВІРКА КОДУ
verifyForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!recoveryUser || !demoCode) {
        showMessage(recoveryMessage, "Спочатку запросіть код підтвердження.");
        return;
    }

    if (Date.now() > codeExpiresAt) {
        demoCode = null;
        showMessage(recoveryMessage, "Термін дії коду минув. Запросіть новий.");
        verifyForm.hidden = true;
        return;
    }

    if (attemptsLeft <= 0) {
        demoCode = null;
        showMessage(recoveryMessage, "Забагато спроб. Запросіть новий код.");
        verifyForm.hidden = true;
        return;
    }

    const enteredCode = $("verificationCode").value.trim();
    attemptsLeft--;

    if (enteredCode !== demoCode) {
        showMessage(
            recoveryMessage,
            `Неправильний код. Залишилося спроб: ${attemptsLeft}.`
        );

        if (attemptsLeft === 0) {
            demoCode = null;
            verifyForm.hidden = true;
        }

        return;
    }

    verified = true;
    demoCode = null;

    verifyForm.hidden = true;
    newPasswordForm.hidden = false;

    showMessage(
        recoveryMessage,
        "Код підтверджено. Створіть новий пароль.",
        true
    );
});

// ВСТАНОВЛЕННЯ НОВОГО ПАРОЛЯ
newPasswordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!verified || !recoveryUser) {
        showMessage(recoveryMessage, "Спочатку підтвердьте код.");
        return;
    }

    const password = $("newPassword").value;
    const confirmPassword = $("confirmNewPassword").value;

    if (password.length < 8) {
        showMessage(recoveryMessage, "Пароль має містити щонайменше 8 символів.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage(recoveryMessage, "Паролі не збігаються.");
        return;
    }

    const users = getUsers();

    const index = users.findIndex((user) =>
        user.email === recoveryUser.email &&
        normalizePhone(user.phone) === normalizePhone(recoveryUser.phone)
    );

    if (index === -1) {
        showMessage(recoveryMessage, "Акаунт не знайдено. Спробуйте ще раз.");
        verified = false;
        recoveryUser = null;
        return;
    }

    // Тільки для демонстрації.
    // У реальному проєкті пароль змінюється через захищений сервер.
    users[index].password = password;
    saveUsers(users);

    recoveryUser = null;
    demoCode = null;
    verified = false;

    recoveryForm.reset();
    verifyForm.reset();
    newPasswordForm.reset();

    verifyForm.hidden = true;
    newPasswordForm.hidden = true;

    showAuthPage("login");

    showMessage(
        loginMessage,
        "Пароль успішно змінено! Тепер увійдіть із новим паролем.",
        true
    );
});
const navButtons = document.querySelectorAll('[data-page]');
const pages = document.querySelectorAll('.page');

// Перемикання сторінок
function showPortalPage(pageId) {
  const target = document.getElementById(pageId);

  if (!target) return;

  pages.forEach(page => {
    page.classList.toggle('active', page.id === pageId);
  });

  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.page === pageId);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(button => {
  button.addEventListener('click', () => {
    showPortalPage(button.dataset.page);
  });
});

// Перехід до форми ідей
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('idea-form').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  document.getElementById('idea-message').focus({
    preventScroll: true
  });
});

// Лічильник символів
const ideaMessage = document.getElementById('idea-message');
const charCount = document.getElementById('char-count');

ideaMessage.addEventListener('input', () => {
  charCount.textContent =
    `${ideaMessage.value.length} / 5000 символів`;
});

// Надсилання ідеї на сервер
const ideaForm = document.getElementById('idea-form');
const submitButton = document.getElementById('submit-button');
const formMessage = document.getElementById('form-message');

ideaForm.addEventListener('submit', async event => {
  event.preventDefault();

  const message = ideaMessage.value.trim();
  const category = document.getElementById('idea-category').value;

  formMessage.className = 'form-message';
  formMessage.textContent = '';

  if (message.length < 10) {
    formMessage.textContent =
      'Будь ласка, напиши трохи детальніше (мінімум 10 символів).';
    formMessage.classList.add('error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Надсилання...';

  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ category, message })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Не вдалося надіслати ідею.');
    }

    formMessage.textContent =
      'Дякую! Твою ідею успішно надіслано.';
    formMessage.classList.add('success');

    ideaForm.reset();
    charCount.textContent = '0 / 5000 символів';
  } catch (error) {
    formMessage.textContent =
      error.message === 'Failed to fetch'
        ? 'Не вдалося з’єднатися із сервером. Перевір підключення.'
        : (error.message || 'Помилка надсилання. Спробуй ще раз.');

    formMessage.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Відправити ідею <span>→</span>';
  }
});

// Профіль користувача
const profileForm = document.getElementById('profile-form');
const photoInput = document.getElementById('photo-input');
const profileAvatar = document.getElementById('profile-avatar');
const headerAvatar = document.getElementById('header-avatar');
const profileHeading = document.getElementById('profile-heading');
const headerName = document.getElementById('header-name');
const profileMessage = document.getElementById('profile-message');

let profilePhoto = '';
let photoUrl = '';

function updateProfilePreview() {
  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const fullName = `${firstName} ${lastName}`.trim();

  profileHeading.textContent = fullName || 'Твій профіль';
  headerName.textContent = fullName || 'Мій профіль';

  const initial = firstName.charAt(0).toUpperCase() || 'М';

  if (!profilePhoto) {
    profileAvatar.textContent = initial;
    headerAvatar.textContent = initial;
  } else {
    profileAvatar.textContent = '';
    headerAvatar.textContent = initial;
  }
}

['first-name', 'last-name'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateProfilePreview);
});

// Завантаження фото
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];

  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    alert('Обери зображення у форматі JPG, PNG або WebP.');
    photoInput.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert('Розмір фото не повинен перевищувати 2 МБ.');
    photoInput.value = '';
    return;
  }

  if (photoUrl) {
    URL.revokeObjectURL(photoUrl);
  }

  profilePhoto = file;
  photoUrl = URL.createObjectURL(file);

  profileAvatar.style.backgroundImage = `url("${photoUrl}")`;
  profileAvatar.classList.add('has-photo');
});

// Збереження профілю в цьому браузері
profileForm.addEventListener('submit', event => {
  event.preventDefault();

  const profile = {
    firstName: document.getElementById('first-name').value.trim(),
    lastName: document.getElementById('last-name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim()
  };

  if (!profile.firstName || !profile.lastName) {
    return;
  }

  try {
    // Не зберігаємо фото у localStorage.
    // Для постійного зберігання фото потрібен сервер.
    localStorage.setItem('cityPortalProfile', JSON.stringify(profile));

    profileMessage.textContent = 'Дані профілю збережено в цьому браузері.';
    profileMessage.className = 'form-message success';

    updateProfilePreview();
  } catch {
    profileMessage.textContent = 'Не вдалося зберегти дані профілю.';
    profileMessage.className = 'form-message error';
  }
});

// Відновлення профілю після перезавантаження
try {
  const savedProfile = localStorage.getItem('cityPortalProfile');

  if (savedProfile) {
    const profile = JSON.parse(savedProfile);

    document.getElementById('first-name').value = profile.firstName || '';
    document.getElementById('last-name').value = profile.lastName || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('email').value = profile.email || '';

    updateProfilePreview();
  }
} catch {
  console.warn('Не вдалося завантажити профіль.');
}