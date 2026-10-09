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

function showPage(page) {
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
    showPage("register");
});

$("backToLogin").addEventListener("click", () => {
    loginForm.reset();
    showPage("login");
});

$("forgotButton").addEventListener("click", () => {
    recoveryForm.reset();
    verifyForm.reset();
    newPasswordForm.reset();

    verifyForm.hidden = true;
    newPasswordForm.hidden = true;

    showPage("forgot");
});

$("backFromRecovery").addEventListener("click", () => {
    recoveryForm.reset();
    verifyForm.reset();
    newPasswordForm.reset();

    verifyForm.hidden = true;
    newPasswordForm.hidden = true;

    showPage("login");
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

    showPage("login");
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

    showPage("login");

    showMessage(
        loginMessage,
        "Пароль успішно змінено! Тепер увійдіть із новим паролем.",
        true
    );
});