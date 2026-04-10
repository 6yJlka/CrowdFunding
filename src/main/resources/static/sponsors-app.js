const sponsorsI18n = window.AppI18n;
const sponsorsState = {
    page: 0,
    size: 12,
    totalPages: 0,
    query: ""
};

bootstrapSponsorsPage().catch((error) => setSponsorsStatus(error.message, "error"));

function bootstrapSponsorsPage() {
    hydrateSponsorsState();
    wireSponsorsEvents();
    return loadSponsors();
}

function hydrateSponsorsState() {
    const params = new URLSearchParams(window.location.search);
    sponsorsState.page = Math.max(Number(params.get("page") ?? "0"), 0);
    sponsorsState.query = params.get("q")?.trim() ?? "";
    document.getElementById("sponsors-search").value = sponsorsState.query;
}

function wireSponsorsEvents() {
    document.getElementById("sponsors-search-btn").addEventListener("click", submitSponsorsSearch);
    document.getElementById("sponsors-search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            submitSponsorsSearch();
        }
    });
    document.getElementById("sponsors-prev-btn").addEventListener("click", () => changeSponsorsPage(-1));
    document.getElementById("sponsors-next-btn").addEventListener("click", () => changeSponsorsPage(1));
}

function submitSponsorsSearch() {
    sponsorsState.query = document.getElementById("sponsors-search").value.trim();
    sponsorsState.page = 0;
    syncSponsorsUrl();
    loadSponsors().catch((error) => setSponsorsStatus(error.message, "error"));
}

function changeSponsorsPage(delta) {
    const nextPage = sponsorsState.page + delta;
    if (nextPage < 0 || nextPage >= Math.max(sponsorsState.totalPages, 1)) {
        return;
    }
    sponsorsState.page = nextPage;
    syncSponsorsUrl();
    loadSponsors().catch((error) => setSponsorsStatus(error.message, "error"));
}

async function loadSponsors() {
    setSponsorsStatus(sponsorsT("sponsors.loading", "Loading sponsors..."), "info");
    const url = new URL("/api/showcase/sponsors", window.location.origin);
    url.searchParams.set("size", `${sponsorsState.size}`);
    url.searchParams.set("page", `${sponsorsState.page}`);
    if (sponsorsState.query) {
        url.searchParams.set("q", sponsorsState.query);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(sponsorsT("sponsors.error", "Could not load sponsors"));
    }

    const payload = await response.json();
    sponsorsState.totalPages = payload.totalPages ?? 0;
    renderSponsors(payload.content ?? []);
    updateSponsorsPagination();
    setSponsorsStatus(
        sponsorsT("sponsors.found", "Found sponsors: {count}").replace("{count}", `${payload.totalElements ?? 0}`),
        "success"
    );
}

function renderSponsors(items) {
    const grid = document.getElementById("sponsors-grid");
    if (!items.length) {
        grid.innerHTML = `<div class="empty-state">${escapeSponsorsHtml(sponsorsT("sponsors.empty", "No sponsors found."))}</div>`;
        return;
    }

    grid.innerHTML = items.map((sponsor) => `
        <article class="project-card sponsor-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeSponsorsHtml(sponsorsT("sponsors.label", "Sponsor"))}</span>
                <span class="meta-pill">${escapeSponsorsHtml(formatSponsorsDate(sponsor.lastSupportedAt))}</span>
            </div>
            <h4>${escapeSponsorsHtml(sponsor.sponsorDisplayName ?? sponsorsT("app.unknown", "Unknown"))}</h4>
            <div class="modal-metrics sponsor-metrics">
                <div class="metric-box">
                    <span>${sponsorsT("sponsors.totalAmount", "Total support")}</span>
                    <strong>${formatSponsorsMoney(sponsor.totalAmount)}</strong>
                </div>
                <div class="metric-box">
                    <span>${sponsorsT("sponsors.projects", "Projects supported")}</span>
                    <strong>${Number(sponsor.supportedProjects ?? 0)}</strong>
                </div>
            </div>
        </article>
    `).join("");
}

function updateSponsorsPagination() {
    document.getElementById("sponsors-pagination-copy").textContent = sponsorsT("catalog.pageOf", "Page {page} of {total}")
        .replace("{page}", `${sponsorsState.page + 1}`)
        .replace("{total}", `${Math.max(sponsorsState.totalPages, 1)}`);
    document.getElementById("sponsors-prev-btn").disabled = sponsorsState.page <= 0;
    document.getElementById("sponsors-next-btn").disabled = sponsorsState.page >= Math.max(sponsorsState.totalPages - 1, 0);
}

function syncSponsorsUrl() {
    const url = new URL(window.location.href);
    if (sponsorsState.query) {
        url.searchParams.set("q", sponsorsState.query);
    } else {
        url.searchParams.delete("q");
    }
    if (sponsorsState.page > 0) {
        url.searchParams.set("page", `${sponsorsState.page}`);
    } else {
        url.searchParams.delete("page");
    }
    window.history.replaceState({}, "", url.search);
}

function setSponsorsStatus(message, type = "") {
    const node = document.getElementById("sponsors-status");
    node.textContent = message;
    node.className = `auth-status ${type}`.trim();
}

function formatSponsorsMoney(value) {
    return new Intl.NumberFormat("en-US", {style: "currency", currency: "USD", maximumFractionDigits: 0}).format(Number(value ?? 0));
}

function formatSponsorsDate(value) {
    if (!value) {
        return sponsorsT("common.recently", "Recently");
    }
    return new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric"}).format(new Date(value));
}

function escapeSponsorsHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function sponsorsT(key, fallback) {
    return sponsorsI18n?.t(key) ?? fallback;
}
