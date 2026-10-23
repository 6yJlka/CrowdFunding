const appI18n = window.AppI18n;
const homePresentation = window.RiseUpProjects;
let currentDashboardData = null;
let currentCatalogProjects = [];
let homeCategories = [];
let homeFeaturedProject = null;
let homeFeaturedState = "loading";
let homeSelectedAmount = 1000;
let homeDashboardError = false;
let homeCatalogError = false;
let homeLoaded = false;

document.addEventListener("app:lang-changed", renderHomepage);
document.getElementById("featured-project").addEventListener("click", (event) => {
    const button = event.target.closest("[data-featured-amount]");
    if (!button) return;
    homeSelectedAmount = Number(button.dataset.featuredAmount);
    syncFeaturedAmount();
});
loadHomepage();

async function homeFetch(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
}

async function loadHomepage() {
    const [dashboard, catalog, categories] = await Promise.allSettled([
        homeFetch("/api/dashboard"),
        homeFetch("/api/projects?size=6&sort=createdAt,desc&status=ACTIVE"),
        homeFetch("/api/categories")
    ]);
    if (dashboard.status === "fulfilled") currentDashboardData = dashboard.value;
    else homeDashboardError = true;
    if (catalog.status === "fulfilled") currentCatalogProjects = catalog.value.content ?? [];
    else homeCatalogError = true;
    if (categories.status === "fulfilled") homeCategories = categories.value;
    homeLoaded = true;
    renderHomepage();

    try {
        homeFeaturedProject = await selectHomeFeaturedProject();
        homeFeaturedState = homeFeaturedProject ? "ready" : "empty";
    } catch {
        homeFeaturedState = "error";
    }
    renderFeaturedProject();
}

async function selectHomeFeaturedProject() {
    const details = new Map(currentCatalogProjects.map((project) => [project.id, project]));
    // Summary rows omit status. Resolve each ID only once, preserving the ranking in each list.
    for (const ranking of [currentDashboardData?.topProjectsMonth, currentDashboardData?.topProjects]) {
        for (const row of ranking ?? []) {
            if (!row.id) continue;
            try {
                if (!details.has(row.id)) details.set(row.id, await homeFetch(`/api/projects/${encodeURIComponent(row.id)}`));
                const project = details.get(row.id);
                if (project.status === "ACTIVE") return project;
            } catch {
                // An unavailable ranked project must not block the remaining candidates.
            }
        }
    }

    // Progress is derived from two amounts, not a sortable API field. Inspect every ACTIVE page
    // so an older, more fully funded project outside the six-card storefront can still win.
    let best = null;
    let bestRatio = -1;
    let page = 0;
    let totalPages = 1;
    while (page < totalPages) {
        const payload = await homeFetch(`/api/projects?status=ACTIVE&size=100&page=${page}&sort=createdAt,desc`);
        for (const project of payload.content ?? []) {
            if (project.status !== "ACTIVE") continue;
            const goal = Number(project.goalAmount);
            const ratio = goal > 0 ? Number(project.collectedAmount ?? 0) / goal : 0;
            if (ratio > bestRatio) { best = project; bestRatio = ratio; }
        }
        totalPages = Math.max(Number(payload.totalPages ?? 1), 1);
        page += 1;
    }
    return best;
}

function renderHomepage() {
    if (!homeLoaded) return;
    if (currentDashboardData) {
        document.getElementById("total-raised").textContent = homePresentation.formatMoney(currentDashboardData.totalRaised, "RUB", true);
        document.getElementById("active-projects").textContent = String(currentDashboardData.activeProjects ?? 0);
        document.getElementById("funded-projects").textContent = String(currentDashboardData.fundedProjects ?? 0);
    }
    document.getElementById("home-metrics").setAttribute("aria-busy", "false");
    const status = document.getElementById("home-status");
    status.hidden = !homeDashboardError;
    status.textContent = homeDashboardError ? appI18n.t("home.statsError") : "";
    status.setAttribute("role", homeDashboardError ? "alert" : "status");

    const grid = document.getElementById("project-grid");
    grid.innerHTML = homeCatalogError ? "" : currentCatalogProjects
        .filter((project) => project.status === "ACTIVE").slice(0, 6)
        .map((project) => homePresentation.renderCard(project, homeCategories)).join("");
    if (!homeCatalogError && !grid.children.length) {
        grid.innerHTML = `<div class="empty-state">${homePresentation.escapeHtml(appI18n.t("home.empty"))}</div>`;
    }
    grid.setAttribute("aria-busy", "false");
    const gridStatus = document.getElementById("home-grid-status");
    gridStatus.hidden = !homeCatalogError;
    gridStatus.textContent = homeCatalogError ? appI18n.t("catalog.error.load") : "";
    gridStatus.setAttribute("role", homeCatalogError ? "alert" : "status");
    renderFeaturedProject();
}

function renderFeaturedProject() {
    const host = document.getElementById("featured-project");
    host.hidden = homeFeaturedState === "empty";
    host.setAttribute("aria-busy", String(homeFeaturedState === "loading"));
    if (homeFeaturedState === "loading" || homeFeaturedState === "error") {
        const key = homeFeaturedState === "loading" ? "home.featuredLoading" : "home.featuredError";
        host.innerHTML = `<p class="home-featured-placeholder" role="${homeFeaturedState === "error" ? "alert" : "status"}">${homePresentation.escapeHtml(appI18n.t(key))}</p>`;
        return;
    }
    if (!homeFeaturedProject) return;
    const project = homeFeaturedProject;
    const escape = homePresentation.escapeHtml;
    const money = (value) => escape(homePresentation.formatMoney(value, project.currency));
    const href = `/project.html?id=${encodeURIComponent(project.id)}`;
    host.style.setProperty("--category-color", homePresentation.categoryColor(project, homeCategories));
    host.innerHTML = `<a class="home-featured-cover" href="${href}" aria-label="${escape(project.title)}">
            ${project.hasCoverImage ? `<img src="/api/projects/${encodeURIComponent(project.id)}/image" alt="">` : ""}
        </a>
        <div class="home-featured-body">
            <div class="home-featured-intro">
                <span class="home-featured-badge">${escape(appI18n.t("home.featured"))} · ${escape(homePresentation.categoryTitle(project, homeCategories))}</span>
                <h2><a href="${href}">${escape(project.title)}</a></h2>
                <p>${escape(project.shortDescription)}</p>
            </div>
            <div class="home-featured-funding">
                <div class="home-featured-totals"><span><strong>${money(project.collectedAmount)}</strong> <span>${escape(appI18n.t("public.of"))} ${money(project.goalAmount)}</span></span><b>${homePresentation.progress(project)}%</b></div>
                <progress class="progress" value="${homePresentation.progress(project)}" max="100" aria-label="${escape(appI18n.t("public.progress"))}"></progress>
                <div class="home-amounts" role="group" aria-label="${escape(appI18n.t("home.amountLabel"))}">
                    ${[300, 1000, 3000, 10000].map((amount) => `<button type="button" class="home-amount-chip" data-featured-amount="${amount}" aria-pressed="${amount === homeSelectedAmount}">${money(amount)}</button>`).join("")}
                </div>
                <a class="dark-btn btn-lg home-featured-support" id="featured-support-link" href="${href}#donation-form"></a>
            </div>
        </div>`;
    syncFeaturedAmount();
}

function syncFeaturedAmount() {
    if (!homeFeaturedProject) return;
    document.querySelectorAll("[data-featured-amount]").forEach((button) => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.featuredAmount) === homeSelectedAmount));
    });
    const link = document.getElementById("featured-support-link");
    link.textContent = appI18n.t("home.supportAmount").replace("{amount}", homePresentation.formatMoney(homeSelectedAmount, homeFeaturedProject.currency));
    link.href = `/project.html?id=${encodeURIComponent(homeFeaturedProject.id)}&amount=${homeSelectedAmount}#donation-form`;
}
