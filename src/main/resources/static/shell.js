const SHELL_AUTH_KEY = "crowdfunding_auth";
const SHELL_I18N = window.AppI18n;

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
        syncCreateLinks("/auth.html");
        return;
    }

    try {
        const response = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error("Unauthorized");
        }

        const user = await response.json();
    const normalizedRoles = normalizeRoles(user.roles);
    const displayName = (user.email || "authorized").split("@")[0];
    const roleLabel = normalizedRoles.length ? normalizedRoles.map(prettyRole).join(", ") : shellT("shell.profile", "User");
    const hideProfileLink = normalizedRoles.includes("ADMIN") || normalizedRoles.includes("SPONSOR");
    const profileHref = resolveProfileHref(normalizedRoles);
    const primaryNav = resolvePrimaryNav(normalizedRoles);

    host.innerHTML = buildShellMarkup({
        loggedIn: true,
        hideProfileLink,
        displayName,
        roleLabel,
        profileHref,
        primaryHref: primaryNav.href,
            primaryLabel: primaryNav.label
        });

        wireShellEvents(true);
        markActiveShellLink();
        syncCreateLinks(primaryNav.href);
    } catch {
        localStorage.removeItem(SHELL_AUTH_KEY);
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
        syncCreateLinks("/auth.html");
    }
}

function buildShellMarkup({loggedIn, hideProfileLink = false, displayName, roleLabel, profileHref, primaryHref, primaryLabel}) {
    const navLinks = [
        shellLink("/", shellT("shell.dashboard", "Dashboard")),
        loggedIn ? (hideProfileLink ? "" : shellLink(profileHref, shellT("shell.profile", "Profile"))) : shellLink(profileHref, shellT("shell.login", "Login")),
        loggedIn ? shellLink(primaryHref, primaryLabel) : ""
    ].join("");

    const dropdownLinks = [
        shellMenuLink("/", shellT("shell.dashboard", "Dashboard")),
        loggedIn ? (hideProfileLink ? "" : shellMenuLink(profileHref, shellT("shell.profile", "Profile"))) : shellMenuLink(profileHref, shellT("shell.profile", "Profile")),
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
            <div class="shell-lang">
                <button class="shell-lang-btn ${shellActiveLangClass("en")}" type="button" data-lang-switch="en">EN</button>
                <button class="shell-lang-btn ${shellActiveLangClass("ru")}" type="button" data-lang-switch="ru">RU</button>
            </div>
            <details class="shell-user-menu">
                <summary class="shell-user-summary">
                    <span class="shell-user-avatar">${getShellInitials(displayName)}</span>
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
}

function markActiveShellLink() {
    const path = window.location.pathname;
    document.querySelectorAll("[data-shell-link]").forEach((link) => {
        const href = link.getAttribute("href");
        const active = href === path || (href === "/" && path === "/index.html");
        link.classList.toggle("active", active);
    });
}

function syncCreateLinks(primaryHref) {
    document.querySelectorAll("#create-campaign-link").forEach((link) => {
        link.setAttribute("href", primaryHref);
    });
}

function readShellAuth() {
    try {
        return JSON.parse(localStorage.getItem(SHELL_AUTH_KEY) || "null");
    } catch {
        return null;
    }
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
