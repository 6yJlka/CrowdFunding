const SHELL_AUTH_KEY = "crowdfunding_auth";
const SHELL_I18N = window.AppI18n;
const SHELL_THEME_KEY = "riseup_theme";
let shellAvatarObjectUrl = "";

applyShellTheme(readShellTheme());

document.addEventListener("DOMContentLoaded", () => {
    mountShell();
    document.addEventListener("app:lang-changed", () => {
        mountShell();
    });
});

async function mountShell() {
    const host = document.getElementById("site-shell");
    if (!host) {
        return;
    }

    host.innerHTML = buildShellMarkup({
        loggedIn: false,
        displayName: shellT("shell.guest", "Guest"),
        roleLabel: shellT("shell.signInHint", "Sign in to continue"),
        profileHref: "/auth.html",
        primaryHref: "/auth.html",
        primaryLabel: shellT("shell.login", "Login")
    });

    const auth = readShellAuth();
    if (!auth?.accessToken) {
        wireShellEvents(false);
        markActiveShellLink();
        syncCreateLinks({href: "/auth.html", visible: true});
        return;
    }

    try {
        const response = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
            }
        });

        if (!response.ok) {
            const authExpired = response.status === 401 || response.status === 403;
            throw new Error(authExpired ? "AUTH_EXPIRED" : `AUTH_REQUEST_FAILED_${response.status}`);
        }

        const user = await response.json();
        const normalizedRoles = normalizeRoles(user.roles);
        const displayName = user.displayName || (user.email || "authorized").split("@")[0];
        const roleLabel = normalizedRoles.length ? normalizedRoles.map(prettyRole).join(", ") : shellT("shell.profile", "User");
        const hideProfileLink = normalizedRoles.includes("ADMIN") || normalizedRoles.includes("SPONSOR");
        const profileHref = resolveProfileHref(normalizedRoles);
        const primaryNav = resolvePrimaryNav(normalizedRoles);
        const avatarUrl = await loadShellAvatar(auth, Boolean(user.hasAvatar));

        host.innerHTML = buildShellMarkup({
            loggedIn: true,
            hideProfileLink,
            displayName,
            roleLabel,
            profileHref,
            avatarUrl,
            primaryHref: primaryNav.href,
            primaryLabel: primaryNav.label
        });

        wireShellEvents(true);
        markActiveShellLink();
        const canCreateProjects = normalizedRoles.includes("AUTHOR")
            && !normalizedRoles.includes("ADMIN")
            && !normalizedRoles.includes("SPONSOR");
        syncCreateLinks({
            href: primaryNav.href,
            visible: canCreateProjects
        });
    } catch (error) {
        if (error?.message === "AUTH_EXPIRED") {
            localStorage.removeItem(SHELL_AUTH_KEY);
        }
        clearShellAvatarUrl();
        host.innerHTML = buildShellMarkup({
            loggedIn: false,
            hideProfileLink: false,
            displayName: shellT("shell.guest", "Guest"),
            roleLabel: shellT("shell.signInHint", "Sign in to continue"),
            profileHref: "/auth.html",
            primaryHref: "/auth.html",
            primaryLabel: shellT("shell.login", "Login")
        });
        wireShellEvents(false);
        markActiveShellLink();
        syncCreateLinks({href: "/auth.html", visible: true});
    }
}

function buildShellMarkup({loggedIn, hideProfileLink = false, displayName, roleLabel, profileHref, avatarUrl = "", primaryHref, primaryLabel}) {
    const profileLabel = resolveProfileLabel(profileHref);
    const navLinks = [
        shellLink("/", shellT("shell.dashboard", "Dashboard")),
        loggedIn ? (hideProfileLink ? "" : shellLink(profileHref, profileLabel)) : shellLink(profileHref, shellT("shell.login", "Login")),
        loggedIn ? shellLink(primaryHref, primaryLabel) : ""
    ].join("");

    const dropdownLinks = [
        shellMenuLink("/", shellT("shell.dashboard", "Dashboard")),
        loggedIn ? (hideProfileLink ? "" : shellMenuLink(profileHref, profileLabel)) : shellMenuLink(profileHref, shellT("shell.profile", "Profile")),
        loggedIn ? shellMenuLink(primaryHref, primaryLabel) : "",
        loggedIn
            ? `<button class="shell-menu-btn shell-menu-danger" type="button" id="shell-logout-btn">${shellT("shell.logout", "Logout")}</button>`
            : shellMenuLink("/auth.html", shellT("shell.signIn", "Sign in"))
    ].join("");

    return `
        <header class="shell-header">
            <a class="shell-brand" href="/">
                <img class="shell-brand-logo" src="/assets/riseup-mark-square.png" alt="RiseUp mark">
                <span>${shellT("shell.brand", "RiseUp")}</span>
            </a>
            <nav class="shell-nav">
                ${navLinks}
            </nav>
            <div class="shell-controls">
                <div class="shell-theme" aria-label="${shellT("shell.theme.label", "Theme")}">
                    <button class="shell-theme-btn ${shellActiveThemeClass("light")}" type="button" data-theme-switch="light">${shellT("shell.theme.light", "Light")}</button>
                    <button class="shell-theme-btn ${shellActiveThemeClass("dark")}" type="button" data-theme-switch="dark">${shellT("shell.theme.dark", "Dark")}</button>
                </div>
                <div class="shell-lang">
                    <button class="shell-lang-btn ${shellActiveLangClass("en")}" type="button" data-lang-switch="en">EN</button>
                    <button class="shell-lang-btn ${shellActiveLangClass("ru")}" type="button" data-lang-switch="ru">RU</button>
                </div>
            </div>
            <details class="shell-user-menu">
                <summary class="shell-user-summary">
                    ${renderShellAvatar(displayName, avatarUrl)}
                    <span class="shell-user-copy">
                        <strong>${escapeShellHtml(displayName)}</strong>
                        <small>${escapeShellHtml(roleLabel)}</small>
                    </span>
                </summary>
                <div class="shell-user-dropdown">
                    ${dropdownLinks}
                </div>
            </details>
        </header>
    `;
}

function shellLink(href, label) {
    return `<a class="shell-link" data-shell-link href="${href}">${label}</a>`;
}

function shellMenuLink(href, label) {
    return `<a class="shell-menu-btn" href="${href}">${label}</a>`;
}

async function loadShellAvatar(auth, hasAvatar) {
    clearShellAvatarUrl();
    if (!hasAvatar) {
        return "";
    }

    try {
        const response = await fetch("/api/me/avatar", {
            headers: {
                "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
            }
        });

        if (!response.ok) {
            return "";
        }

        const blob = await response.blob();
        shellAvatarObjectUrl = URL.createObjectURL(blob);
        return shellAvatarObjectUrl;
    } catch {
        return "";
    }
}

function clearShellAvatarUrl() {
    if (shellAvatarObjectUrl) {
        URL.revokeObjectURL(shellAvatarObjectUrl);
        shellAvatarObjectUrl = "";
    }
}

function renderShellAvatar(displayName, avatarUrl) {
    if (avatarUrl) {
        return `<img class="shell-user-avatar shell-user-avatar-image" src="${avatarUrl}" alt="${escapeShellHtml(displayName)}">`;
    }
    return `<span class="shell-user-avatar">${getShellInitials(displayName)}</span>`;
}

function wireShellEvents(loggedIn) {
    const logoutButton = document.getElementById("shell-logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem(SHELL_AUTH_KEY);
            window.location.href = "/";
        });
    }

    document.querySelectorAll("[data-lang-switch]").forEach((button) => {
        button.addEventListener("click", () => {
            const lang = button.getAttribute("data-lang-switch");
            SHELL_I18N?.setLang(lang);
        });
    });

    document.querySelectorAll("[data-theme-switch]").forEach((button) => {
        button.addEventListener("click", () => {
            const theme = button.getAttribute("data-theme-switch");
            applyShellTheme(theme);
            try {
                localStorage.setItem(SHELL_THEME_KEY, theme === "dark" ? "dark" : "light");
            } catch {
                return;
            } finally {
                mountShell();
            }
        });
    });
}

function markActiveShellLink() {
    const path = window.location.pathname;
    document.querySelectorAll("[data-shell-link]").forEach((link) => {
        const href = link.getAttribute("href");
        const active = href === path || (href === "/" && path === "/index.html");
        link.classList.toggle("active", active);
    });
}

function syncCreateLinks({href, visible}) {
    document.querySelectorAll("#create-campaign-link").forEach((link) => {
        link.setAttribute("href", href);
        link.hidden = !visible;
        link.classList.toggle("hidden", !visible);
        link.setAttribute("aria-hidden", String(!visible));
    });
}

function readShellAuth() {
    try {
        return JSON.parse(localStorage.getItem(SHELL_AUTH_KEY) || "null");
    } catch {
        return null;
    }
}

function readShellTheme() {
    try {
        const stored = localStorage.getItem(SHELL_THEME_KEY);
        if (stored === "light" || stored === "dark") {
            return stored;
        }
    } catch {
        return resolvePreferredTheme();
    }
    return resolvePreferredTheme();
}

function resolvePreferredTheme() {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyShellTheme(theme) {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function normalizeRoles(roles) {
    return (Array.isArray(roles) ? roles : [])
        .map((role) => String(role).replace("ROLE_", "").trim())
        .filter(Boolean);
}

function prettyRole(role) {
    switch (role) {
        case "AUTHOR":
            return shellT("shell.role.author", "Author");
        case "SPONSOR":
            return shellT("shell.role.sponsor", "Sponsor");
        case "ADMIN":
            return shellT("shell.role.admin", "Admin");
        default:
            return role.charAt(0) + role.slice(1).toLowerCase();
    }
}

function resolveProfileHref(roles) {
    if (roles.includes("ADMIN")) {
        return "/admin-dashboard.html";
    }
    if (roles.includes("AUTHOR")) {
        return "/author-dashboard.html";
    }
    if (roles.includes("SPONSOR")) {
        return "/sponsor-dashboard.html";
    }
    return "/auth.html";
}

function resolvePrimaryNav(roles) {
    if (roles.includes("ADMIN")) {
        return {href: "/admin-dashboard.html", label: shellT("shell.moderation", "Moderation")};
    }
    if (roles.includes("AUTHOR")) {
        return {href: "/create-project.html", label: shellT("shell.create", "Create")};
    }
    if (roles.includes("SPONSOR")) {
        return {href: "/sponsor-dashboard.html", label: shellT("shell.sponsored", "Sponsored")};
    }
    return {href: "/auth.html", label: shellT("shell.login", "Login")};
}

function resolveProfileLabel(profileHref) {
    if (profileHref === "/author-dashboard.html") {
        return shellT("shell.myProjects", "My projects");
    }
    return shellT("shell.profile", "Profile");
}

function getShellInitials(name) {
    return String(name || "G")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "G";
}

function escapeShellHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function shellT(key, fallback) {
    return SHELL_I18N?.t(key) ?? fallback;
}

function shellActiveLangClass(lang) {
    return (SHELL_I18N?.getLang() ?? "en") === lang ? "active" : "";
}

function shellActiveThemeClass(theme) {
    return readShellTheme() === theme ? "active" : "";
}
