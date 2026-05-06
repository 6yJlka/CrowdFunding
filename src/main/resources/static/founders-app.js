const foundersI18n = window.AppI18n;
const foundersState = {
    page: 0,
    size: 12,
    totalPages: 0,
    query: ""
};

bootstrapFoundersPage().catch((error) => setFoundersStatus(error.message, "error"));

function bootstrapFoundersPage() {
    hydrateFoundersState();
    wireFoundersEvents();
    return loadFounders();
}

function hydrateFoundersState() {
    const params = new URLSearchParams(window.location.search);
    foundersState.page = Math.max(Number(params.get("page") ?? "0"), 0);
    foundersState.query = params.get("q")?.trim() ?? "";
    document.getElementById("founders-search").value = foundersState.query;
}

function wireFoundersEvents() {
    const runFoundersSearchDebounced = debounce(submitFoundersSearch, 250);

    document.getElementById("founders-search-btn").addEventListener("click", submitFoundersSearch);
    document.getElementById("founders-search").addEventListener("input", () => {
        runFoundersSearchDebounced();
    });
    document.getElementById("founders-search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            submitFoundersSearch();
        }
    });
    document.getElementById("founders-prev-btn").addEventListener("click", () => changeFoundersPage(-1));
    document.getElementById("founders-next-btn").addEventListener("click", () => changeFoundersPage(1));
}

function submitFoundersSearch() {
    foundersState.query = document.getElementById("founders-search").value.trim();
    foundersState.page = 0;
    syncFoundersUrl();
    loadFounders().catch((error) => setFoundersStatus(error.message, "error"));
}

function changeFoundersPage(delta) {
    const nextPage = foundersState.page + delta;
    if (nextPage < 0 || nextPage >= Math.max(foundersState.totalPages, 1)) {
        return;
    }
    foundersState.page = nextPage;
    syncFoundersUrl();
    loadFounders().catch((error) => setFoundersStatus(error.message, "error"));
}

async function loadFounders() {
    setFoundersStatus(foundersT("founders.loading", "Loading founders..."), "info");
    const url = new URL("/api/showcase/founders", window.location.origin);
    url.searchParams.set("size", `${foundersState.size}`);
    url.searchParams.set("page", `${foundersState.page}`);
    if (foundersState.query) {
        url.searchParams.set("q", foundersState.query);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(foundersT("founders.error", "Could not load founders"));
    }

    const payload = await response.json();
    foundersState.totalPages = payload.totalPages ?? 0;
    renderFoundersPage(payload.content ?? []);
    updateFoundersPagination();
    setFoundersStatus(
        foundersT("founders.found", "Found founders: {count}").replace("{count}", `${payload.totalElements ?? 0}`),
        "success"
    );
}

function renderFoundersPage(items) {
    const grid = document.getElementById("founders-grid-page");
    if (!items.length) {
        grid.innerHTML = `<div class="empty-state">${escapeFoundersHtml(foundersT("founders.empty", "No founders found."))}</div>`;
        return;
    }

    grid.innerHTML = items.map((founder) => `
        <article class="community-card sponsor-card founder-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeFoundersHtml(foundersT("founders.label", "Founder"))}</span>
                <span class="meta-pill">${escapeFoundersHtml(formatFoundersDate(founder.latestProjectCreatedAt))}</span>
            </div>
            <div class="founder-card-identity">
                ${renderFounderAvatar(founder)}
                <div class="founder-card-copy">
                    <h4>${escapeFoundersHtml(founder.authorDisplayName ?? foundersT("app.unknown", "Unknown"))}</h4>
                </div>
            </div>
            <div class="modal-metrics sponsor-metrics">
                <div class="metric-box">
                    <span>${foundersT("founders.projects", "Projects")}</span>
                    <strong>${Number(founder.projectsCount ?? 0)}</strong>
                </div>
                <div class="metric-box">
                    <span>${foundersT("founders.totalRaised", "Total raised")}</span>
                    <strong>${formatFoundersMoney(founder.totalRaised)}</strong>
                </div>
            </div>
        </article>
    `).join("");
}

function renderFounderAvatar(founder) {
    const name = founder.authorDisplayName ?? foundersT("app.unknown", "Unknown");
    if (founder.hasAvatar && founder.authorId) {
        return `<img class="founder-card-avatar" src="/api/showcase/founders/${encodeURIComponent(founder.authorId)}/avatar" alt="${escapeFoundersHtml(name)}">`;
    }
    return `<span class="founder-card-avatar founder-card-avatar-fallback">${escapeFoundersHtml(getFounderInitials(name))}</span>`;
}

function updateFoundersPagination() {
    document.getElementById("founders-pagination-copy").textContent = foundersT("catalog.pageOf", "Page {page} of {total}")
        .replace("{page}", `${foundersState.page + 1}`)
        .replace("{total}", `${Math.max(foundersState.totalPages, 1)}`);
    document.getElementById("founders-prev-btn").textContent = window.AppI18n.t("projects.prev");
    document.getElementById("founders-next-btn").textContent = window.AppI18n.t("projects.next");
    document.getElementById("founders-prev-btn").disabled = foundersState.page <= 0;
    document.getElementById("founders-next-btn").disabled = foundersState.page >= Math.max(foundersState.totalPages - 1, 0);
}

function syncFoundersUrl() {
    const url = new URL(window.location.href);
    if (foundersState.query) {
        url.searchParams.set("q", foundersState.query);
    } else {
        url.searchParams.delete("q");
    }
    if (foundersState.page > 0) {
        url.searchParams.set("page", `${foundersState.page}`);
    } else {
        url.searchParams.delete("page");
    }
    window.history.replaceState({}, "", url.search);
}

function setFoundersStatus(message, type = "") {
    const node = document.getElementById("founders-status");
    node.textContent = message;
    node.className = `auth-status ${type}`.trim();
}

function formatFoundersMoney(value) {
    return new Intl.NumberFormat(resolveFoundersLocale(), {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function formatFoundersDate(value) {
    if (!value) {
        return foundersT("common.recently", "Recently");
    }
    return new Intl.DateTimeFormat(resolveFoundersLocale(), {month: "short", day: "numeric", year: "numeric"}).format(new Date(value));
}

function escapeFoundersHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function foundersT(key, fallback) {
    return foundersI18n?.t(key) ?? fallback;
}

function getFounderInitials(name) {
    return String(name || "F")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "F";
}

function resolveFoundersLocale() {
    return foundersI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}

function debounce(callback, delayMs) {
    let timeoutId;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delayMs);
    };
}
