const SHELL_AUTH_KEY = "crowdfunding_auth";

document.addEventListener("DOMContentLoaded", () => {
    mountShell();
});

async function mountShell() {
    const host = document.getElementById("site-shell");
    if (!host) {
        return;
    }

    host.innerHTML = buildShellMarkup({
        loggedIn: false,
        displayName: "Guest",
        roleLabel: "Sign in to continue",
        profileHref: "/auth.html",
        primaryHref: "/auth.html",
        primaryLabel: "Login"
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
    const roleLabel = normalizedRoles.length ? normalizedRoles.map(prettyRole).join(", ") : "User";
    const isAdmin = normalizedRoles.includes("ADMIN");
    const profileHref = resolveProfileHref(normalizedRoles);
    const primaryNav = resolvePrimaryNav(normalizedRoles);

    host.innerHTML = buildShellMarkup({
        loggedIn: true,
        isAdmin,
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
            isAdmin: false,
            displayName: "Guest",
            roleLabel: "Sign in to continue",
            profileHref: "/auth.html",
            primaryHref: "/auth.html",
            primaryLabel: "Login"
        });
        wireShellEvents(false);
        markActiveShellLink();
        syncCreateLinks("/auth.html");
    }
}

function buildShellMarkup({loggedIn, isAdmin = false, displayName, roleLabel, profileHref, primaryHref, primaryLabel}) {
    const navLinks = [
        shellLink("/", "Dashboard"),
        loggedIn ? (isAdmin ? "" : shellLink(profileHref, "Profile")) : shellLink(profileHref, "Login"),
        loggedIn ? shellLink(primaryHref, primaryLabel) : ""
    ].join("");

    const dropdownLinks = [
        shellMenuLink("/", "Dashboard"),
        loggedIn ? (isAdmin ? "" : shellMenuLink(profileHref, "Profile")) : shellMenuLink(profileHref, "Profile"),
        loggedIn ? shellMenuLink(primaryHref, primaryLabel) : "",
        loggedIn
            ? `<button class="shell-menu-btn shell-menu-danger" type="button" id="shell-logout-btn">Logout</button>`
            : shellMenuLink("/auth.html", "Sign in")
    ].join("");

    return `
        <header class="shell-header">
            <a class="shell-brand" href="/">
                <span class="shell-brand-mark"></span>
                <span>CrowdFunding</span>
            </a>
            <nav class="shell-nav">
                ${navLinks}
            </nav>
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
            return "Author";
        case "SPONSOR":
            return "Sponsor";
        case "ADMIN":
            return "Admin";
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
        return {href: "/admin-dashboard.html", label: "Moderation"};
    }
    if (roles.includes("AUTHOR")) {
        return {href: "/create-project.html", label: "Create"};
    }
    if (roles.includes("SPONSOR")) {
        return {href: "/sponsor-dashboard.html", label: "Sponsored"};
    }
    return {href: "/auth.html", label: "Login"};
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
