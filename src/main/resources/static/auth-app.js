const AUTH_STORAGE_KEY = "crowdfunding_auth";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const statusBox = document.getElementById("auth-status");
const authI18n = window.AppI18n;

document.querySelectorAll(".auth-tab").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    await submitAuth("/api/auth/login", payload, authT("auth.status.loginSuccess", "Logged in. Redirecting..."));
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const payload = Object.fromEntries(formData.entries());
    await submitAuth("/api/auth/register", payload, authT("auth.status.registerSuccess", "Account created. Redirecting..."));
});

function switchTab(tab) {
    const isLogin = tab === "login";
    loginForm.classList.toggle("hidden", !isLogin);
    registerForm.classList.toggle("hidden", isLogin);
    document.querySelectorAll(".auth-tab").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === tab);
    });
    setStatus("");
}

async function submitAuth(url, payload, successMessage) {
    setStatus(authT("auth.status.processing", "Processing..."), "info");
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || authT("auth.status.failed", "Authentication failed"));
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
    statusBox.textContent = message;
    statusBox.className = `auth-status ${type}`.trim();
}

function authT(key, fallback) {
    return authI18n?.t(key) ?? fallback;
}
