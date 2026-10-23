const SHELL_AUTH_KEY = "crowdfunding_auth";
const SHELL_I18N = window.AppI18n;
let shellMountVersion = 0;

window.RiseUpSession = (() => {
    let expiring = false;
    function expire() {
        if (expiring) return;
        expiring = true;
        localStorage.removeItem(SHELL_AUTH_KEY);
        window.RiseUpToast?.clear();
        window.location.replace("/auth.html?reason=session-expired");
    }
    return Object.freeze({
        get expiring() { return expiring; },
        async request(url, options = {}) {
            if (new URL(url, window.location.href).origin !== window.location.origin) throw new TypeError("Authenticated requests must use the application origin");
            const auth = readShellAuth();
            if (expiring || !auth?.accessToken?.trim()) {
                expire();
                return new Response(null, {status: 401});
            }
            const headers = new Headers(options.headers);
            headers.set("Authorization", `${auth.tokenType || "Bearer"} ${auth.accessToken.trim()}`);
            const response = await fetch(url, {...options, headers});
            if (response.status === 401) expire();
            return response;
        }
    });
})();

window.RiseUpProfile = Object.freeze({
    async saveBio(bio) {
        const response = await window.RiseUpSession.request("/api/me/profile", {
            method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({bio})
        });
        if (!response.ok) throw new Error("profile.saveError");
        return response.json();
    },
    async uploadAvatar(file) {
        const body = new FormData();
        body.append("avatar", file);
        // The browser supplies the multipart boundary; only the session adds authentication.
        const response = await window.RiseUpSession.request("/api/me/avatar", {method: "POST", body});
        if (!response.ok) throw new Error("profile.avatarSaveError");
    },
    async loadAvatar() {
        const response = await window.RiseUpSession.request("/api/me/avatar");
        return response.ok ? response.blob() : null;
    }
});

window.RiseUpToast = (() => {
    const storageKey = "riseup_toast";
    let current = null, timer = null, node = null;
    function persist() {
        try {
            if (current) sessionStorage.setItem(storageKey, JSON.stringify(current));
            else sessionStorage.removeItem(storageKey);
        } catch { /* Notifications still work if session storage is unavailable. */ }
    }
    function draw() {
        if (!current || current.expiresAt <= Date.now()) { clear(); return; }
        if (!node) {
            node = document.createElement("div");
            node.id = "riseup-toast";
            node.className = "riseup-toast";
            node.setAttribute("role", "status");
            node.setAttribute("aria-live", "polite");
            node.setAttribute("aria-atomic", "true");
        }
        const host = [...document.querySelectorAll("dialog[open]")].at(-1) || document.body;
        host.append(node);
        node.textContent = window.AppI18n.t(current.message);
        for (const [key, value] of Object.entries(current.params || {})) node.textContent = node.textContent.replaceAll(`{${key}}`, String(value));
        node.dataset.type = current.type;
        node.hidden = false;
        window.clearTimeout(timer);
        timer = window.setTimeout(clear, Math.max(0, current.expiresAt - Date.now()));
    }
    function clear() {
        window.clearTimeout(timer);
        current = null;
        if (node) node.hidden = true;
        persist();
    }
    document.addEventListener("DOMContentLoaded", () => {
        try { current = JSON.parse(sessionStorage.getItem(storageKey) || "null"); } catch { current = null; }
        if (current) draw();
    });
    document.addEventListener("app:lang-changed", draw);
    document.addEventListener("close", () => { if (current) draw(); }, true);
    return Object.freeze({
        show(message, type = "success", params = {}) {
            if (!message || window.RiseUpSession.expiring) return;
            current = {message: String(message), type, params, expiresAt: Date.now() + 3000};
            persist();
            draw();
        },
        clear
    });
})();

const RISEUP_PALETTE = Object.freeze(["#C6F24E", "#FF6A3D", "#FFD23F", "#7C8CFF", "#5FD4C4", "#F2B8E0"]);
const RISEUP_CATEGORY_FALLBACK_PALETTE = Object.freeze(["#F2B8E0", "#B9A3FF", "#FFB38A", "#9BE7FF"]);
const RISEUP_CATEGORY_COLORS = Object.freeze({
    art: RISEUP_PALETTE[0], tech: RISEUP_PALETTE[4], education: RISEUP_PALETTE[2],
    charity: RISEUP_PALETTE[1], social: RISEUP_PALETTE[3]
});

function hashRiseUpValue(value) {
    let hash = 0;
    for (const symbol of String(value ?? "")) hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    return hash;
}

function resolveProfileColor(id) {
    return RISEUP_PALETTE[hashRiseUpValue(id) % RISEUP_PALETTE.length];
}

function resolveCategoryColor(slug) {
    const key = String(slug ?? "").trim().toLowerCase();
    return Object.hasOwn(RISEUP_CATEGORY_COLORS, key)
        ? RISEUP_CATEGORY_COLORS[key]
        : RISEUP_CATEGORY_FALLBACK_PALETTE[hashRiseUpValue(key) % RISEUP_CATEGORY_FALLBACK_PALETTE.length];
}

// One listbox implementation for catalog sorting and moderation controls.
window.RiseUpDropdown = (() => {
    const instances = new WeakMap();
    let opened = null;
    const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (symbol) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[symbol]));
    const check = '<svg class="dropdown-check" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="m3 9 4 4 8-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    function markup({id, label, value, options, attribute = "", disabled = false}) {
        return `<div class="dropdown"><button type="button" class="dropdown-trigger" id="${escape(id)}" value="${escape(value)}" ${attribute} ${disabled ? "disabled" : ""} aria-haspopup="listbox" aria-expanded="false" aria-controls="${escape(id)}-options" aria-label="${escape(label)}"><span class="dropdown-value"></span><span class="dropdown-arrow" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 14 14"><path d="m3 5 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button><ul class="dropdown-menu" id="${escape(id)}-options" role="listbox" tabindex="-1" aria-label="${escape(label)}" hidden>${options.map(([option, key], index) => `<li class="dropdown-option" id="${escape(id)}-option-${index}" role="option" aria-selected="${String(option === value)}" data-dropdown-value="${escape(option)}"><span data-i18n-key="${escape(key)}">${escape(window.AppI18n.t(key))}</span>${check}</li>`).join("")}</ul></div>`;
    }
    function wire(host, {value, onChange} = {}) {
        if (instances.has(host)) return instances.get(host);
        const trigger = host.querySelector('[aria-haspopup="listbox"]'), menu = host.querySelector('[role="listbox"]');
        const options = [...menu.querySelectorAll('[role="option"]')];
        const optionValue = (option) => option.dataset.dropdownValue ?? option.dataset.sortValue;
        let active = 0;
        menu.setAttribute("popover", "manual");
        function setValue(next) {
            trigger.value = next;
            options.forEach((option) => {
                const selected = optionValue(option) === next;
                option.setAttribute("aria-selected", String(selected));
                if (selected) {
                    const text = option.querySelector("[data-i18n-key]").textContent;
                    host.querySelector(".dropdown-value").textContent = text;
                    if (!trigger.hasAttribute("aria-labelledby")) {
                        trigger.dataset.dropdownLabel ||= trigger.getAttribute("aria-label");
                        trigger.setAttribute("aria-label", `${trigger.dataset.dropdownLabel}, ${text}`);
                    }
                }
            });
        }
        function position() {
            const rect = trigger.getBoundingClientRect(), width = Math.min(Math.max(rect.width, 190), innerWidth - 16);
            const height = Math.min(options.length * 44 + 12, innerHeight - 16);
            const below = innerHeight - rect.bottom - 16, above = rect.top - 16;
            const up = below < Math.min(height, 144) && above > below;
            menu.style.setProperty("--dropdown-left", `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`);
            menu.style.setProperty("--dropdown-top", `${up ? Math.max(8, rect.top - height - 8) : rect.bottom + 8}px`);
            menu.style.setProperty("--dropdown-width", `${width}px`);
            menu.style.setProperty("--dropdown-height", `${Math.max(44, up ? above : below)}px`);
        }
        function highlight() {
            options.forEach((option, index) => option.classList.toggle("is-highlighted", index === active));
            menu.setAttribute("aria-activedescendant", options[active].id);
            const option = options[active];
            if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
            else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
        }
        function close(restoreFocus = false) {
            if (menu.hidden) return;
            if (menu.matches(":popover-open")) menu.hidePopover();
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
            if (opened === control) opened = null;
            if (restoreFocus && trigger.isConnected) trigger.focus({preventScroll: true});
        }
        function open() {
            if (trigger.disabled || !options.length) return;
            opened?.close(); opened = control;
            active = Math.max(0, options.findIndex((option) => optionValue(option) === trigger.value));
            menu.hidden = false;
            menu.showPopover();
            position();
            trigger.setAttribute("aria-expanded", "true");
            menu.focus({preventScroll: true}); highlight();
        }
        function select() {
            const next = optionValue(options[active]), changed = trigger.value !== next;
            setValue(next); close(true);
            if (changed) { onChange?.(next); trigger.dispatchEvent(new Event("change", {bubbles: true})); }
        }
        trigger.addEventListener("click", () => menu.hidden ? open() : close(true));
        trigger.addEventListener("keydown", (event) => {
            if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); open(); }
        });
        menu.addEventListener("keydown", (event) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                active = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                highlight();
            } else if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(); }
            else if (event.key === "Escape") { event.preventDefault(); close(true); }
            else if (event.key === "Tab") close(true);
        });
        menu.addEventListener("click", (event) => {
            const option = event.target.closest('[role="option"]');
            if (option && options.includes(option)) { active = options.indexOf(option); select(); }
        });
        const control = {host, menu, close, position, setValue};
        instances.set(host, control); setValue(value ?? trigger.value);
        return control;
    }
    document.addEventListener("pointerdown", (event) => { if (opened && !opened.host.contains(event.target)) opened.close(); });
    document.addEventListener("focusin", (event) => { if (opened && !opened.host.contains(event.target)) opened.close(); });
    document.addEventListener("scroll", (event) => { if (opened && event.target !== opened.menu) opened.close(); }, true);
    window.addEventListener("resize", () => opened?.close());
    document.addEventListener("app:lang-changed", () => {
        opened?.close();
        document.querySelectorAll(".dropdown").forEach((host) => { const instance = instances.get(host); if (instance) instance.setValue(host.querySelector(".dropdown-trigger").value); });
    });
    return Object.freeze({markup, wire, close: () => opened?.close()});
})();

window.RiseUpUI = Object.freeze({
    resolveCategoryColor,
    resolveProfileColor,
    openModal(dialog) {
        if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
        dialog.showModal();
        document.body.classList.add("modal-open");
    },
    closeModal(dialog) {
        if (!(dialog instanceof HTMLDialogElement)) return;
        dialog.close();
        // A caller may remove the dialog before its queued close event reaches document.
        // Keep the page locked only while another modal (e.g. the profile editor) is open.
        document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog.modal-dialog[open]")));
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // Browsers may match :focus-visible for text fields even after a pointer click.
    // Track input modality so the shared keyboard ring remains keyboard-only there too.
    document.addEventListener("pointerdown", () => document.documentElement.classList.add("using-pointer"), true);
    document.addEventListener("keydown", (event) => {
        if (!event.metaKey && !event.ctrlKey && !event.altKey && !["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
            document.documentElement.classList.remove("using-pointer");
        }
        if (event.key === "Tab") {
            const dialog = [...document.querySelectorAll("dialog.modal-dialog[open]")].at(-1);
            if (!dialog) return;
            const controls = [...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
                .filter((node) => !node.matches(":disabled") && node.tabIndex >= 0 && node.getClientRects().length);
            const first = controls[0], last = controls.at(-1);
            if (!first) { event.preventDefault(); return; }
            if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            }
        }
    }, true);
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
        const request = /\/(?:author-dashboard|sponsor-dashboard|admin-dashboard|admin-project-review|create-project|edit-project)\.html$/.test(window.location.pathname)
            ? window.RiseUpSession.request : fetch;
        const response = await request("/api/auth/me", {
            headers: {
                "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
            }
        });

        if (!response.ok) {
            const authExpired = response.status === 401;
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
        if (window.RiseUpSession.expiring) return;
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
    const paymentPage = window.location.pathname === "/pay.html";
    const authPage = window.location.pathname === "/auth.html";
    const cabinet = /\/(?:author-dashboard|sponsor-dashboard|admin-dashboard|admin-project-review|create-project|edit-project)\.html$/.test(window.location.pathname);
    const navLinks = [shellLink("/projects.html", shellT("shell.projects"))];
    if (!cabinet) navLinks.push(shellLink("/analytics.html", shellT("shell.analytics")));
    if (loggedIn) navLinks.push(shellLink(profileHref, resolveProfileLabel(profileHref)));
    const actions = authPage ? `<a class="secondary-btn" href="/"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 12-4-4 4-4"/></svg>${shellT("auth.homeLink")}</a>` : paymentPage ? `<a class="ghost-btn" href="/sponsor-dashboard.html">${shellT("shell.myDonations")}</a>` : loggedIn
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
        ${paymentPage || authPage ? "" : `<nav class="shell-nav" aria-label="${shellT("shell.navigation")}">${navLinks.join("")}</nav>`}
        <div class="shell-actions">${loggedIn && profileHref === "/admin-dashboard.html" && /\/admin-(?:dashboard|project-review)\.html$/.test(window.location.pathname) ? `<span class="status-badge shell-admin-badge" data-status="MODERATION">${shellT("shell.role.admin")}</span>` : ""}${actions}</div>
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
        const launch = link.closest(".home-launch");
        if (launch) launch.hidden = !visible;
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
        if (project.categoryId == null) return t("category.uncategorized");
        const item = category(project, categories);
        const key = `category.${item?.slug}`;
        const translated = t(key);
        return translated !== key ? translated : (item?.title || project.categoryTitle || t("category.unknown"));
    }

    function categoryColor(project, categories) {
        if (project.categoryId == null) return "#3A3A40";
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

// Form presentation only: request bodies and media uploads stay in each page controller.
window.RiseUpEditor = (form, categorySelect) => {
    let categories = [];
    let storedProject = {};
    const t = (key) => window.AppI18n.t(key);
    const presentation = window.RiseUpProjects;
    const escape = presentation.escapeHtml;
    const group = document.getElementById("editor-categories");
    const render = () => {
        const categoryId = categorySelect.value ? Number(categorySelect.value) : null;
        const project = {...storedProject, title: form.title.value.trim(), shortDescription: form.shortDescription.value.trim(), goalAmount: Number(form.goalAmount.value), currency: form.currency.value.trim().toUpperCase() || "RUB", categoryId};
        const end = form.endAt;
        const start = form.startAt;
        end.setCustomValidity(end.value && start.value && end.value <= start.value ? t("editor.dateError") : "");
        document.querySelectorAll("[data-editor-counter]").forEach((counter) => {
            const input = document.getElementById(counter.dataset.editorCounter);
            counter.textContent = `${input.value.length} / ${input.maxLength}`;
        });
        document.getElementById("project-cover-preview-title").textContent = project.title || t("editor.previewTitle");
        document.getElementById("editor-preview-short").textContent = project.shortDescription || t("editor.previewShort");
        document.getElementById("project-cover-preview-category").textContent = presentation.categoryTitle(project, categories);
        document.getElementById("project-cover-preview-fallback").style.backgroundColor = presentation.categoryColor(project, categories);
        const progress = presentation.progress(project);
        document.getElementById("editor-preview-progress").value = Math.min(progress, 100);
        document.getElementById("editor-preview-percent").textContent = `${progress}%`;
        document.getElementById("editor-preview-totals").textContent = `${presentation.formatMoney(project.collectedAmount, project.currency)} ${t("public.of")} ${presentation.formatMoney(project.goalAmount, project.currency)}`;
        const focusedId = group.contains(document.activeElement) ? document.activeElement.dataset.category : null;
        const choices = [{id: "", title: t("category.uncategorized")}, ...categories];
        group.innerHTML = choices.map((category) => {
            const selected = String(category.id) === categorySelect.value;
            const title = category.id === "" ? category.title : presentation.categoryTitle({categoryId: category.id}, categories);
            const color = category.id === "" ? "#3A3A40" : window.RiseUpUI.resolveCategoryColor(category.slug);
            return `<button type="button" class="editor-category-chip" role="radio" data-category="${escape(category.id)}" aria-checked="${selected}" tabindex="${selected ? 0 : -1}" ${categorySelect.disabled ? "disabled" : ""} style="--category-color:${color}">${escape(title)}</button>`;
        }).join("");
        group.querySelectorAll("button").forEach((button, index, buttons) => {
            button.addEventListener("click", () => {
                categorySelect.value = button.dataset.category;
                categorySelect.dispatchEvent(new Event("change", {bubbles: true}));
                group.querySelectorAll("button")[index]?.focus({preventScroll: true});
            });
            button.addEventListener("keydown", (event) => {
                if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
                buttons[next].click();
            });
        });
        if (focusedId !== null) [...group.querySelectorAll("button")].find((button) => button.dataset.category === focusedId)?.focus({preventScroll: true});
    };
    document.getElementById("editor-upload-trigger").addEventListener("click", () => document.getElementById("project-image-input").click());
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    document.addEventListener("app:lang-changed", () => { syncCategoryOptions(); render(); });
    const syncCategoryOptions = () => {
        const selected = categorySelect.value;
        categorySelect.innerHTML = `<option value="">${escape(t("category.uncategorized"))}</option>${categories.map((category) => `<option value="${escape(category.id)}">${escape(presentation.categoryTitle({categoryId: category.id}, categories))}</option>`).join("")}`;
        categorySelect.value = selected;
    };
    render();
    return {
        render,
        setCategories(items) { categories = items; syncCategoryOptions(); render(); },
        setProject(project) { storedProject = project; render(); }
    };
};

window.RiseUpModeration = (() => {
    const t = (key) => window.AppI18n.t(key);
    const esc = window.RiseUpProjects.escapeHtml;
    const locale = () => window.AppI18n.getLang() === "ru" ? "ru-RU" : "en-US";
    function date(value) {
        return value && Number.isFinite(new Date(value).getTime())
            ? new Intl.DateTimeFormat(locale(), {day: "numeric", month: "short", year: "numeric"}).format(new Date(value)) : "—";
    }
    function markup(project, categories, prefix = "moderation", reason = "") {
        const category = window.RiseUpProjects.categoryTitle(project, categories);
        const status = project.status || "MODERATION";
        const tiles = [["app.author", project.authorDisplayName || t("app.unknown")], ["editor.categoryLabel", category],
            ["app.goal", window.RiseUpProjects.formatMoney(project.goalAmount, project.currency)], ["moderation.dates", `${date(project.startAt)} — ${date(project.endAt)}`]];
        return `<article class="moderation-review"><div class="moderation-review-cover" style="--category-color:${window.RiseUpProjects.categoryColor(project, categories)}">${project.hasCoverImage ? `<img src="/api/projects/${encodeURIComponent(project.id)}/image" alt="">` : ""}<span class="status-badge" data-status="${esc(status)}">${esc(t(`project.status.${status}`))}</span></div><div class="moderation-review-body"><div class="moderation-review-intro"><h2 id="${prefix}-project-title">${esc(project.title)}</h2><p>${esc(project.shortDescription)}</p></div><dl class="moderation-review-meta">${tiles.map(([key, value]) => `<div><dt>${esc(t(key))}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl><section class="moderation-review-description"><h3>${esc(t("moderation.description"))}</h3><p>${esc(project.description || "")}</p></section>${project.rejectionReason ? `<p class="project-revision-note">${esc(t("editor.moderator"))} ${esc(project.rejectionReason)}</p>` : ""}<div class="field moderation-reason-field"><div class="field-heading"><label for="${prefix}-reject-reason">${esc(t("moderation.rejectReason"))}</label><output class="field-counter" for="${prefix}-reject-reason" data-reason-counter>${reason.length} / 500</output></div><textarea id="${prefix}-reject-reason" rows="3" maxlength="500" required data-rejection-reason placeholder="${esc(t("moderation.reasonPlaceholder"))}" aria-describedby="${prefix}-reason-error" ${status !== "MODERATION" ? "disabled" : ""}>${esc(reason)}</textarea><p class="field-error" id="${prefix}-reason-error" data-reason-error role="alert" hidden></p></div><div class="moderation-review-actions"><button class="primary-btn" id="${prefix}-approve-btn" type="button" data-moderation-action="approve" ${status !== "MODERATION" ? "disabled" : ""}>${esc(t("moderation.approve"))}</button><button class="danger-outline-btn" id="${prefix}-reject-btn" type="button" data-moderation-action="reject" ${status !== "MODERATION" ? "disabled" : ""}>${esc(t("moderation.reject"))}</button></div></div></article>`;
    }
    function wireReason(root, onInput = () => {}) {
        const input = root.querySelector("[data-rejection-reason]");
        input.addEventListener("input", () => {
            root.querySelector("[data-reason-counter]").textContent = `${input.value.length} / 500`;
            input.removeAttribute("aria-invalid");
            root.querySelector("[data-reason-error]").hidden = true;
            onInput(input.value);
        });
    }
    function validateReason(root) {
        const input = root.querySelector("[data-rejection-reason]");
        const reason = input.value.trim();
        if (reason && reason.length <= 500) return reason;
        input.setAttribute("aria-invalid", "true");
        const error = root.querySelector("[data-reason-error]");
        error.textContent = t("moderation.reasonError");
        error.hidden = false;
        input.focus();
        window.RiseUpToast.show("moderation.reasonError", "error");
        return null;
    }
    function busy(root, pending, status = "MODERATION") {
        root.querySelectorAll("[data-moderation-action], [data-rejection-reason]").forEach((node) => { node.disabled = pending || status !== "MODERATION"; });
        root.setAttribute("aria-busy", String(pending));
    }
    function confirmDelete() {
        return new Promise((resolve) => {
            const dialog = document.createElement("dialog");
            dialog.className = "modal-dialog moderation-confirm";
            dialog.setAttribute("aria-labelledby", "moderation-delete-title");
            dialog.innerHTML = `<h2 id="moderation-delete-title">${esc(t("project.comment.deleteConfirm"))}</h2><p>${esc(t("project.comment.deleteDescription"))}</p><div class="modal-dialog-actions"><button class="secondary-btn" type="button" data-modal-close>${esc(t("common.cancel"))}</button><button class="danger-outline-btn" type="button" data-confirm-accept>${esc(t("project.comment.delete"))}</button></div>`;
            dialog.querySelector("[data-confirm-accept]").addEventListener("click", () => dialog.close("confirm"));
            dialog.addEventListener("close", () => { resolve(dialog.returnValue === "confirm"); dialog.remove(); }, {once: true});
            document.body.append(dialog);
            window.RiseUpUI.openModal(dialog);
        });
    }
    return Object.freeze({markup, wireReason, validateReason, busy, date, confirmDelete});
})();
