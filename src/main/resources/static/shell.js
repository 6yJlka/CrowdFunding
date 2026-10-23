const SHELL_AUTH_KEY = "crowdfunding_auth";
const SHELL_I18N = window.AppI18n;
let shellMountVersion = 0;

const RISEUP_PALETTE = Object.freeze(["#C6F24E", "#FF6A3D", "#FFD23F", "#7C8CFF", "#5FD4C4", "#F2B8E0"]);
const RISEUP_CATEGORY_COLORS = Object.freeze({
    art: RISEUP_PALETTE[0], tech: RISEUP_PALETTE[4], education: RISEUP_PALETTE[2],
    charity: RISEUP_PALETTE[1], social: RISEUP_PALETTE[3]
});

function resolveProfileColor(id) {
    let hash = 0;
    for (const symbol of String(id ?? "")) hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    return RISEUP_PALETTE[hash % RISEUP_PALETTE.length];
}

function resolveCategoryColor(slug) {
    const key = String(slug ?? "").trim().toLowerCase();
    return Object.hasOwn(RISEUP_CATEGORY_COLORS, key) ? RISEUP_CATEGORY_COLORS[key] : resolveProfileColor(key);
}

window.RiseUpUI = Object.freeze({
    resolveCategoryColor,
    resolveProfileColor,
    openModal(dialog) {
        if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
        dialog.showModal();
        document.body.classList.add("modal-open");
    },
    closeModal(dialog) {
        if (dialog instanceof HTMLDialogElement) dialog.close();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    mountShell();
    document.addEventListener("app:lang-changed", () => {
        mountShell();
    });
    // Native dialogs contain focus, handle Escape and return focus to the trigger.
    document.addEventListener("click", (event) => {
        const dialog = event.target.closest("dialog.modal-dialog");
        if (!dialog) return;
        if (event.target.closest("[data-modal-close]")) {
            dialog.close();
        } else if (event.target === dialog) {
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        }
    });
    document.addEventListener("close", (event) => {
        if (event.target.matches?.("dialog.modal-dialog") && !document.querySelector("dialog.modal-dialog[open]")) {
            document.body.classList.remove("modal-open");
        }
    }, true);
});

async function mountShell() {
    const host = document.getElementById("site-shell");
    if (!host) {
        return;
    }
    const version = ++shellMountVersion;

    host.innerHTML = buildShellMarkup({
        loggedIn: false,
        profileHref: "/auth.html",
        primaryHref: "/auth.html"
    });

    const auth = readShellAuth();
    if (!auth?.accessToken) {
        wireShellEvents();
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
        if (version !== shellMountVersion) return;
        const normalizedRoles = normalizeRoles(user.roles);
        const profileHref = resolveProfileHref(normalizedRoles);
        const primaryNav = resolvePrimaryNav(normalizedRoles);

        host.innerHTML = buildShellMarkup({
            loggedIn: true,
            profileHref,
            primaryHref: primaryNav.href
        });

        wireShellEvents();
        markActiveShellLink();
        const canCreateProjects = normalizedRoles.includes("AUTHOR")
            && !normalizedRoles.includes("ADMIN")
            && !normalizedRoles.includes("SPONSOR");
        syncCreateLinks({
            href: primaryNav.href,
            visible: canCreateProjects
        });
    } catch (error) {
        if (version !== shellMountVersion) return;
        if (error?.message === "AUTH_EXPIRED") {
            localStorage.removeItem(SHELL_AUTH_KEY);
        }
        host.innerHTML = buildShellMarkup({
            loggedIn: false,
            profileHref: "/auth.html",
            primaryHref: "/auth.html"
        });
        wireShellEvents();
        markActiveShellLink();
        syncCreateLinks({href: "/auth.html", visible: true});
    }
}

function buildShellMarkup({loggedIn, profileHref, primaryHref}) {
    const cabinet = /\/(?:author-dashboard|sponsor-dashboard|admin-dashboard|admin-project-review|create-project|edit-project)\.html$/.test(window.location.pathname);
    const navLinks = [shellLink("/projects.html", shellT("shell.projects"))];
    if (!cabinet) navLinks.push(shellLink("/index.html#how", shellT("shell.how")), shellLink("/analytics.html", shellT("shell.analytics")));
    if (loggedIn) navLinks.push(shellLink(profileHref, resolveProfileLabel(profileHref)));
    const actions = loggedIn
        ? `${primaryHref === "/create-project.html" && !cabinet ? `<a class="primary-btn" href="${primaryHref}">${shellT("shell.launch")}</a>` : ""}
           <button class="ghost-btn" type="button" id="shell-logout-btn">${shellT("shell.logout")}</button>`
        : `<a class="ghost-btn" href="/auth.html">${shellT("shell.login")}</a><a class="primary-btn" href="/auth.html">${shellT("shell.launch")}</a>`;
    mountShellFooter();
    return `<header class="shell-header">
        <a class="shell-brand" href="/" aria-label="${shellT("shell.home")}">
            <svg class="shell-brand-mark" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                <circle cx="15" cy="15" r="15" fill="currentColor"/>
                <path d="M8 19l7-8 7 8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg><span>RISEUP</span>
        </a>
        <nav class="shell-nav" aria-label="${shellT("shell.navigation")}">${navLinks.join("")}</nav>
        <div class="shell-actions">${actions}</div>
        <div class="shell-lang" role="group" aria-label="${shellT("shell.language")}">
            ${["ru", "en"].map((lang) => `<button class="shell-lang-btn ${shellActiveLangClass(lang)}" type="button" data-lang-switch="${lang}" lang="${lang}" aria-label="${shellT(`shell.language.${lang}`)}" aria-pressed="${(SHELL_I18N?.getLang() ?? "en") === lang}">${lang.toUpperCase()}</button>`).join("")}
        </div>
    </header>`;
}

function mountShellFooter() {
    let footer = document.getElementById("site-footer");
    if (!footer) {
        footer = document.createElement("footer");
        footer.id = "site-footer";
        footer.className = "shell-footer";
        document.body.append(footer);
    }
    footer.innerHTML = `<span>© RiseUp 2026</span><nav aria-label="${shellT("shell.footerNavigation")}">
        <a href="/projects.html">${shellT("shell.projects")}</a>
        <a href="/index.html#how">${shellT("shell.how")}</a>
        <a href="https://github.com/6yJlka/CrowdFunding">${shellT("shell.source")}</a>
    </nav>`;
}

function shellLink(href, label) {
    return `<a class="shell-link" data-shell-link href="${href}">${label}</a>`;
}

function wireShellEvents() {
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
    const sectionPath = {
        "/project.html": "/projects.html",
        "/create-project.html": "/author-dashboard.html",
        "/edit-project.html": "/author-dashboard.html",
        "/admin-project-review.html": "/admin-dashboard.html"
    }[path] || path;
    document.querySelectorAll("[data-shell-link]").forEach((link) => {
        const href = link.getAttribute("href");
        const active = href === sectionPath;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
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

function normalizeRoles(roles) {
    return (Array.isArray(roles) ? roles : [])
        .map((role) => String(role).replace("ROLE_", "").trim())
        .filter(Boolean);
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
        return {href: "/admin-dashboard.html"};
    }
    if (roles.includes("AUTHOR")) {
        return {href: "/create-project.html"};
    }
    if (roles.includes("SPONSOR")) {
        return {href: "/sponsor-dashboard.html"};
    }
    return {href: "/auth.html"};
}

function resolveProfileLabel(profileHref) {
    if (profileHref === "/author-dashboard.html") {
        return shellT("shell.myProjects", "My projects");
    }
    if (profileHref === "/sponsor-dashboard.html") return shellT("shell.myDonations");
    if (profileHref === "/admin-dashboard.html") return shellT("shell.moderation");
    return shellT("shell.profile", "Profile");
}

function shellT(key, fallback = key) {
    return SHELL_I18N?.t(key) ?? fallback;
}

function shellActiveLangClass(lang) {
    return (SHELL_I18N?.getLang() ?? "en") === lang ? "active" : "";
}

// Shared presentation for public project cards. Category IDs resolve to API slugs.
window.RiseUpProjects = (() => {
    const t = (key) => window.AppI18n.t(key);
    const locale = () => window.AppI18n.getLang() === "ru" ? "ru-RU" : "en-US";
    const escapeHtml = (value) => String(value ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

    function formatMoney(value, currency = "RUB", compact = false) {
        return new Intl.NumberFormat(locale(), {
            style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "RUB",
            maximumFractionDigits: compact ? 1 : 0,
            notation: compact ? "compact" : "standard"
        }).format(Number(value ?? 0));
    }

    function category(project, categories) {
        return categories.find((item) => String(item.id) === String(project.categoryId));
    }

    function categoryTitle(project, categories) {
        const item = category(project, categories);
        const key = `category.${item?.slug}`;
        const translated = t(key);
        return translated !== key ? translated : (item?.title || project.categoryTitle || t("category.general"));
    }

    function categoryColor(project, categories) {
        return window.RiseUpUI.resolveCategoryColor(category(project, categories)?.slug ?? "");
    }

    function progress(project) {
        const goal = Number(project.goalAmount ?? 0);
        const raw = goal > 0 ? Math.max(0, Number(project.collectedAmount ?? 0) / goal * 100) : 0;
        return project.status === "ACTIVE" ? Math.min(Math.floor(raw), 99) : Math.round(raw);
    }

    function renderCard(project, categories = []) {
        const percent = progress(project);
        const href = `/project.html?id=${encodeURIComponent(project.id)}`;
        const money = (value) => escapeHtml(formatMoney(value, project.currency));
        return `<a class="project-card public-project-card" href="${href}">
            <div class="project-card-media" style="--category-color:${categoryColor(project, categories)}">
                ${project.hasCoverImage ? `<img class="project-card-cover project-cover-image" src="/api/projects/${encodeURIComponent(project.id)}/image" alt="" loading="lazy">` : ""}
                <div class="public-project-badges">
                    <span class="category-badge">${escapeHtml(categoryTitle(project, categories))}</span>
                    ${project.status === "FUNDED" ? `<span class="goal-badge">${escapeHtml(t("public.goalReached"))}</span>` : ""}
                </div>
            </div>
            <div class="project-card-content">
                <h2 class="project-card-title">${escapeHtml(project.title)}</h2>
                <p class="public-project-description">${escapeHtml(project.shortDescription)}</p>
                <progress class="progress" value="${Math.min(percent, 100)}" max="100" aria-label="${escapeHtml(t("public.progress"))}"></progress>
                <div class="public-project-totals"><span><b>${money(project.collectedAmount)}</b> ${escapeHtml(t("public.of"))} ${money(project.goalAmount)}</span><span>${percent}%</span></div>
            </div>
        </a>`;
    }

    return Object.freeze({renderCard, categoryTitle, categoryColor, formatMoney, progress, escapeHtml});
})();
