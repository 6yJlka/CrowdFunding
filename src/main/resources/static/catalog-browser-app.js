const catalogPageState = {
    query: "",
    categoryId: "",
    sort: "createdAt,desc",
    page: 0,
    size: 9,
    status: document.body.dataset.catalogStatus || "ACTIVE",
    emptyMessage: document.body.dataset.catalogEmpty || "No projects found.",
    totalPages: 0,
    totalElements: 0
};

const catalogGridNode = document.getElementById("catalog-page-grid");
const catalogStatusNode = document.getElementById("catalog-page-status");
const catalogSearchNode = document.getElementById("catalog-page-search");
const catalogCategoryNode = document.getElementById("catalog-category-filter");
const catalogSortNode = document.getElementById("catalog-sort-filter");
const catalogChipRowNode = document.getElementById("catalog-chip-row");
const catalogPrevNode = document.getElementById("catalog-prev-btn");
const catalogNextNode = document.getElementById("catalog-next-btn");
const catalogPaginationCopyNode = document.getElementById("catalog-pagination-copy");
const catalogI18n = window.AppI18n;

let catalogCategories = [];
let currentCatalogProjects = [];
let currentModalProject = null;
let currentModalReviews = [];

bootstrapCatalogPage().catch((error) => setCatalogPageStatus(error.message, "error"));
document.addEventListener("app:lang-changed", () => {
    hydrateCatalogHeading();
    loadCatalogCategories()
        .then(() => loadCatalogPageProjects())
        .catch((error) => setCatalogPageStatus(error.message, "error"));
    if (currentModalProject) {
        renderCatalogProjectModal(currentModalProject, currentModalReviews);
    }
});

async function bootstrapCatalogPage() {
    hydrateCatalogHeading();
    hydrateCatalogStateFromUrl();
    wireCatalogPageEvents();
    await loadCatalogCategories();
    await loadCatalogPageProjects();
}

function hydrateCatalogHeading() {
    const title = document.body.dataset.catalogTitle;
    const kicker = document.body.dataset.catalogKicker;
    if (title) {
        document.getElementById("catalog-title").textContent = title;
    }
    if (kicker) {
        document.getElementById("catalog-kicker").textContent = kicker;
    }
}

function hydrateCatalogStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    catalogPageState.query = params.get("q")?.trim() ?? "";
    catalogPageState.categoryId = params.get("categoryId") ?? "";
    catalogPageState.sort = params.get("sort") ?? "createdAt,desc";
    catalogPageState.page = Math.max(Number(params.get("page") ?? "0"), 0);

    catalogSearchNode.value = catalogPageState.query;
    catalogSortNode.value = catalogPageState.sort;
}

function wireCatalogPageEvents() {
    const runCatalogSearchDebounced = debounce(submitCatalogSearch, 250);

    document.getElementById("catalog-page-search-btn").addEventListener("click", submitCatalogSearch);

    catalogSearchNode.addEventListener("input", () => {
        runCatalogSearchDebounced();
    });

    catalogSearchNode.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            submitCatalogSearch();
        }
    });

    catalogCategoryNode.addEventListener("change", () => {
        catalogPageState.categoryId = catalogCategoryNode.value;
        catalogPageState.page = 0;
        renderCatalogChips();
        syncCatalogUrl();
        loadCatalogPageProjects().catch((error) => setCatalogPageStatus(error.message, "error"));
    });

    catalogSortNode.addEventListener("change", () => {
        catalogPageState.sort = catalogSortNode.value;
        catalogPageState.page = 0;
        syncCatalogUrl();
        loadCatalogPageProjects().catch((error) => setCatalogPageStatus(error.message, "error"));
    });

    catalogChipRowNode.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-category-id]");
        if (!chip) {
            return;
        }

        const nextCategoryId = chip.getAttribute("data-category-id");
        catalogPageState.categoryId = nextCategoryId === catalogPageState.categoryId ? "" : nextCategoryId;
        catalogCategoryNode.value = catalogPageState.categoryId;
        catalogPageState.page = 0;
        renderCatalogChips();
        syncCatalogUrl();
        loadCatalogPageProjects().catch((error) => setCatalogPageStatus(error.message, "error"));
    });

    catalogPrevNode.addEventListener("click", () => {
        if (catalogPageState.page <= 0) {
            return;
        }
        catalogPageState.page -= 1;
        syncCatalogUrl();
        loadCatalogPageProjects().catch((error) => setCatalogPageStatus(error.message, "error"));
    });

    catalogNextNode.addEventListener("click", () => {
        if (catalogPageState.page >= Math.max(catalogPageState.totalPages - 1, 0)) {
            return;
        }
        catalogPageState.page += 1;
        syncCatalogUrl();
        loadCatalogPageProjects().catch((error) => setCatalogPageStatus(error.message, "error"));
    });

    catalogGridNode.addEventListener("click", (event) => {
        const button = event.target.closest("[data-project-id]");
        if (!button) {
            return;
        }
        openCatalogProjectModal(button.getAttribute("data-project-id"));
    });

    document.getElementById("modal-close").addEventListener("click", closeCatalogProjectModal);
    document.getElementById("modal-backdrop").addEventListener("click", closeCatalogProjectModal);
}

function submitCatalogSearch() {
    catalogPageState.query = catalogSearchNode.value.trim();
    catalogPageState.page = 0;
    syncCatalogUrl();
    loadCatalogPageProjects().catch((error) => setCatalogPageStatus(error.message, "error"));
}

async function loadCatalogCategories() {
    const response = await fetch("/api/categories");
    if (!response.ok) {
        throw new Error(catalogT("catalog.error.categories", "Could not load categories"));
    }

    catalogCategories = await response.json();
    catalogCategoryNode.innerHTML = `
        <option value="">${catalogT("projects.allCategories", "All categories")}</option>
        ${catalogCategories.map((category) => `<option value="${category.id}">${escapeCatalogHtml(category.title)}</option>`).join("")}
    `;
    catalogCategoryNode.value = catalogPageState.categoryId;
    renderCatalogChips();
}

async function loadCatalogPageProjects() {
    setCatalogPageStatus(catalogT("catalog.loading", "Loading projects..."), "info");

    const url = new URL("/api/projects", window.location.origin);
    url.searchParams.set("size", `${catalogPageState.size}`);
    url.searchParams.set("page", `${catalogPageState.page}`);
    url.searchParams.set("status", catalogPageState.status);
    url.searchParams.set("sort", catalogPageState.sort);

    if (catalogPageState.query) {
        url.searchParams.set("q", catalogPageState.query);
    }
    if (catalogPageState.categoryId) {
        url.searchParams.set("categoryId", catalogPageState.categoryId);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(catalogT("catalog.error.load", "Could not load project catalog"));
    }

    const payload = await response.json();
    catalogPageState.totalPages = payload.totalPages ?? 0;
    catalogPageState.totalElements = payload.totalElements ?? 0;
    currentCatalogProjects = payload.content ?? [];
    renderCatalogPageProjects(currentCatalogProjects);
    updateCatalogPagination();
    syncCatalogUrl();
    setCatalogPageStatus(catalogT("catalog.found", "{count} project(s) found").replace("{count}", `${payload.totalElements ?? 0}`), "success");
}

function renderCatalogPageProjects(projects) {
    if (!projects.length) {
        catalogGridNode.innerHTML = `<div class="empty-state">${escapeCatalogHtml(catalogPageState.emptyMessage)}</div>`;
        return;
    }

    catalogGridNode.innerHTML = projects.map((project) => {
        const percent = getCatalogProgress(project.collectedAmount, project.goalAmount);
        return `
            <article class="project-card">
                <div class="project-card-header">
                    <span class="status-badge">${escapeCatalogHtml(project.status ?? catalogPageState.status)}</span>
                    <span class="meta-pill">${escapeCatalogHtml(project.categoryTitle ?? catalogT("app.general", "General"))}</span>
                </div>
                <h4>${escapeCatalogHtml(project.title)}</h4>
                <p>${escapeCatalogHtml(project.shortDescription ?? "")}</p>
                <div class="project-meta">
                    <span>${escapeCatalogHtml(project.authorDisplayName ?? catalogT("app.unknownAuthor", "Unknown author"))}</span>
                    <span>${formatCatalogMoney(project.goalAmount)}</span>
                </div>
                <div class="project-progress">
                    <div class="project-progress-head">
                        <span>${formatCatalogMoney(project.collectedAmount)} ${catalogT("app.raised", "raised")}</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-value" style="width:${Math.min(percent, 100)}%"></div>
                    </div>
                </div>
                <div class="project-card-footer">
                    <strong>${escapeCatalogHtml(project.currency ?? "RUB")}</strong>
                    <div class="project-card-footer-actions">
                        <a class="ghost-btn" href="/project.html?id=${project.id}">${catalogT("app.openPage", "Open page")}</a>
                        <button class="ghost-btn" type="button" data-project-id="${project.id}">${catalogT("app.quickView", "Quick view")}</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

async function openCatalogProjectModal(projectId) {
    const modal = document.getElementById("project-modal");
    const body = document.getElementById("modal-body");
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    body.innerHTML = `<p class="panel-kicker">${catalogT("app.project", "Project")}</p><h3>${catalogT("app.loading", "Loading...")}</h3><p class="modal-copy">${catalogT("app.fetchingProject", "Fetching project details.")}</p>`;

    try {
        const [projectResponse, reviewsResponse] = await Promise.all([
            fetch(`/api/projects/${projectId}`),
            fetch(`/api/projects/${projectId}/reviews`)
        ]);

        if (!projectResponse.ok) {
            throw new Error(catalogT("catalog.error.project", "Could not load project"));
        }

        const project = await projectResponse.json();
        const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];
        currentModalProject = project;
        currentModalReviews = reviews;
        renderCatalogProjectModal(project, reviews);
    } catch (error) {
        currentModalProject = null;
        currentModalReviews = [];
        body.innerHTML = `<p class="panel-kicker">${catalogT("app.project", "Project")}</p><h3>${catalogT("app.unavailable", "Unavailable")}</h3><p class="modal-copy">${catalogT("app.couldNotLoadCampaign", "Could not load this campaign.")}</p>`;
        console.error(error);
    }
}

function renderCatalogProjectModal(project, reviews) {
    const percent = getCatalogProgress(project.collectedAmount, project.goalAmount);
    document.getElementById("modal-body").innerHTML = `
        <p class="panel-kicker">${escapeCatalogHtml(project.categoryTitle ?? catalogT("app.project", "Project"))}</p>
        <h3>${escapeCatalogHtml(project.title)}</h3>
        <p class="modal-copy">${escapeCatalogHtml(project.description || project.shortDescription || "")}</p>
        <div class="modal-metrics">
            <div class="metric-box">
                <span>${catalogT("app.raisedCap", "Raised")}</span>
                <strong>${formatCatalogMoney(project.collectedAmount)}</strong>
            </div>
            <div class="metric-box">
                <span>${catalogT("app.goal", "Goal")}</span>
                <strong>${formatCatalogMoney(project.goalAmount)}</strong>
            </div>
            <div class="metric-box">
                <span>${catalogT("app.progress", "Progress")}</span>
                <strong>${percent}%</strong>
            </div>
            <div class="metric-box">
                <span>${catalogT("app.author", "Author")}</span>
                <strong>${escapeCatalogHtml(project.authorDisplayName ?? catalogT("app.unknown", "Unknown"))}</strong>
            </div>
        </div>
        <div class="project-progress">
            <div class="project-progress-head">
                <span>${catalogT("app.fundingStatus", "Funding status")}</span>
                <span>${percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-value" style="width:${Math.min(percent, 100)}%"></div>
            </div>
        </div>
        <div class="project-card-footer project-modal-actions">
            <a class="primary-btn small-btn" href="/project.html?id=${project.id}">${catalogT("app.openFullPage", "Open full page")}</a>
        </div>
        <div class="review-list">
            ${reviews.length ? reviews.map((review) => `
                <article class="review-card">
                    <div class="review-head">
                        <strong>${escapeCatalogHtml(review.userDisplayName ?? catalogT("app.anonymous", "Anonymous"))}</strong>
                        <span class="review-rating">${"★".repeat(review.rating || 0)}</span>
                    </div>
                    <p>${escapeCatalogHtml(review.reviewText ?? "")}</p>
                </article>
            `).join("") : `<div class="empty-state">${catalogT("app.noReviewsForCampaign", "No reviews yet for this campaign.")}</div>`}
        </div>
    `;
}

function closeCatalogProjectModal() {
    document.getElementById("project-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
    currentModalProject = null;
    currentModalReviews = [];
}

function renderCatalogChips() {
    if (!catalogCategories.length) {
        catalogChipRowNode.innerHTML = "";
        return;
    }

    catalogChipRowNode.innerHTML = catalogCategories.slice(0, 8).map((category) => {
        const active = String(category.id) === String(catalogPageState.categoryId);
        return `
            <button class="catalog-chip${active ? " active" : ""}" type="button" data-category-id="${category.id}">
                ${escapeCatalogHtml(category.title)}
            </button>
        `;
    }).join("");
}

function updateCatalogPagination() {
    const currentPage = catalogPageState.page + 1;
    const totalPages = Math.max(catalogPageState.totalPages, 1);
    catalogPaginationCopyNode.textContent = catalogT("catalog.pageOf", "Page {page} of {total}")
        .replace("{page}", `${currentPage}`)
        .replace("{total}", `${totalPages}`);
    catalogPrevNode.disabled = catalogPageState.page <= 0;
    catalogNextNode.disabled = catalogPageState.page >= Math.max(catalogPageState.totalPages - 1, 0);
}

function syncCatalogUrl() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (catalogPageState.query) {
        params.set("q", catalogPageState.query);
    } else {
        params.delete("q");
    }

    if (catalogPageState.categoryId) {
        params.set("categoryId", catalogPageState.categoryId);
    } else {
        params.delete("categoryId");
    }

    if (catalogPageState.sort !== "createdAt,desc") {
        params.set("sort", catalogPageState.sort);
    } else {
        params.delete("sort");
    }

    if (catalogPageState.page > 0) {
        params.set("page", `${catalogPageState.page}`);
    } else {
        params.delete("page");
    }

    window.history.replaceState({}, "", params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname);
}

function setCatalogPageStatus(message, type = "") {
    catalogStatusNode.textContent = message;
    catalogStatusNode.className = `auth-status ${type}`.trim();
}

function getCatalogProgress(collectedAmount, goalAmount) {
    const collected = Number(collectedAmount ?? 0);
    const goal = Number(goalAmount ?? 0);
    if (!goal) {
        return 0;
    }
    return Math.round((collected / goal) * 100);
}

function formatCatalogMoney(value) {
    return new Intl.NumberFormat(resolveCatalogLocale(), {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function escapeCatalogHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function debounce(callback, delayMs) {
    let timeoutId;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delayMs);
    };
}

function catalogT(key, fallback) {
    return catalogI18n?.t(key) ?? fallback;
}

function resolveCatalogLocale() {
    return catalogI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}
