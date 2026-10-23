const AUTH_STORAGE_KEY = "crowdfunding_auth";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const statusBox = document.getElementById("auth-status");
const authI18n = window.AppI18n;
let authStatus = {message: "", type: ""};
let authBusy = false;
let authDashboard = null;
let authStatsFailed = false;

document.querySelectorAll(".auth-tab").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const tab = event.key === "Home" ? "login" : event.key === "End" ? "register" : button.dataset.tab === "login" ? "register" : "login";
        switchTab(tab);
        document.getElementById(`${tab}-tab`).focus();
    });
});
document.querySelectorAll("[data-auth-switch]").forEach((button) => button.addEventListener("click", () => {
    switchTab(button.dataset.authSwitch);
    document.getElementById(`${button.dataset.authSwitch}-tab`).focus();
}));
const roleButtons = [...document.querySelectorAll("[data-auth-role]")];
roleButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
        registerForm.elements.role.value = button.dataset.authRole;
        roleButtons.forEach((item) => {
            const selected = item === button;
            item.setAttribute("aria-checked", String(selected));
            item.tabIndex = selected ? 0 : -1;
        });
    });
    button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
        roleButtons[next].click();
        roleButtons[next].focus();
    });
});
document.getElementById("register-name").addEventListener("input", (event) => {
    document.getElementById("auth-name-counter").textContent = `${event.target.value.length} / 120`;
});
document.addEventListener("app:lang-changed", () => {
    setStatus(authStatus.message, authStatus.type);
    renderAuthStats();
});
loadAuthStats();

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    await submitAuth("/api/auth/login", payload, "auth.status.loginSuccess");
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const payload = Object.fromEntries(formData.entries());
    await submitAuth("/api/auth/register", payload, "auth.status.registerSuccess");
});

function switchTab(tab) {
    const isLogin = tab === "login";
    loginForm.classList.toggle("hidden", !isLogin);
    registerForm.classList.toggle("hidden", isLogin);
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    document.querySelectorAll(".auth-tab").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === tab);
        button.setAttribute("aria-selected", String(button.dataset.tab === tab));
        button.tabIndex = button.dataset.tab === tab ? 0 : -1;
    });
    setStatus("");
}

async function submitAuth(url, payload, successMessage) {
    if (authBusy) return;
    setAuthBusy(true);
    setStatus("auth.status.processing", "info");
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || "auth.status.failed");
        }

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            tokenType: body.tokenType || "Bearer",
            accessToken: body.accessToken
        }));

        setStatus(successMessage, "success");
        const target = await resolvePostAuthRedirect(payload.role);
        window.setTimeout(() => {
            window.location.href = target;
        }, 600);
    } catch (error) {
        setStatus(error.message, "error");
        setAuthBusy(false);
    }
}

async function resolvePostAuthRedirect(registerRole) {
    if (registerRole === "SPONSOR") {
        return "/";
    }
    if (registerRole === "AUTHOR") {
        return "/author-dashboard.html";
    }
    if (registerRole === "ADMIN") {
        return "/admin-dashboard.html";
    }

    try {
        const auth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
        if (!auth?.accessToken) {
            return "/";
        }

        const response = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
            }
        });

        if (!response.ok) {
            return "/";
        }

        const me = await response.json();
        const roles = Array.isArray(me.roles) ? me.roles.map((role) => String(role).replace("ROLE_", "")) : [];
        if (roles.includes("ADMIN")) {
            return "/admin-dashboard.html";
        }
        if (roles.includes("AUTHOR")) {
            return "/author-dashboard.html";
        }
        return "/";
    } catch {
        return "/";
    }
}

function setStatus(message, type = "") {
    authStatus = {message, type};
    statusBox.textContent = message ? authT(message, message) : "";
    statusBox.className = `auth-status ${type}`.trim();
    statusBox.setAttribute("role", type === "error" ? "alert" : "status");
}

function setAuthBusy(busy) {
    authBusy = busy;
    document.querySelectorAll('.auth-access-panel button').forEach((button) => { button.disabled = busy; });
    [loginForm, registerForm].forEach((form) => form.setAttribute("aria-busy", String(busy)));
}

async function loadAuthStats() {
    try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) throw new Error("Dashboard unavailable");
        authDashboard = await response.json();
    } catch {
        authStatsFailed = true;
    }
    document.getElementById("auth-live-stats").setAttribute("aria-busy", "false");
    renderAuthStats();
}

function renderAuthStats() {
    const locale = authI18n?.getLang() === "ru" ? "ru-RU" : "en-US";
    const number = (value) => value == null ? "—" : new Intl.NumberFormat(locale).format(value);
    document.getElementById("auth-stat-campaigns").textContent = number(authDashboard?.activeProjects);
    document.getElementById("auth-stat-backers").textContent = number(authDashboard?.totalBackers);
    document.getElementById("auth-stat-raised").textContent = authDashboard?.totalRaised == null ? "—" : window.RiseUpProjects.formatMoney(authDashboard.totalRaised, "RUB", true);
    const note = document.getElementById("auth-stats-note");
    note.hidden = !authStatsFailed;
    note.textContent = authStatsFailed ? authT("auth.statsUnavailable") : "";
}

function authT(key, fallback) {
    return authI18n?.t(key) ?? fallback;
}
