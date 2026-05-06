const catalogPageState = {
    query: "",
    categoryId: "",
    authorId: "",
    sort: "createdAt,desc",
    page: 0,
    size: 9,
    status: document.body.dataset.catalogStatus || "ACTIVE",
    emptyMessage: document.body.dataset.catalogEmpty || window.AppI18n.t("catalog.empty"),
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
const UNCATEGORIZED_CATEGORY_TOKEN = "__uncategorized__";

let catalogCategories = [];
let currentCatalogProjects = [];
let currentModalProject = null;
let currentModalReviews = [];

bootstrapCatalogPage().catch((error) => setCatalogPageStatus(error.message, "error"));
document.addEventListener("app:lang-changed", () => {
    hydrateCatalogHeading();
    catalogPageState.emptyMessage = document.body.dataset.catalogEmpty || window.AppI18n.t("catalog.empty");
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
    catalogPageState.categoryId = params.get("uncategorized") === "true"
        ? UNCATEGORIZED_CATEGORY_TOKEN
        : (params.get("categoryId") ?? "");
    catalogPageState.authorId = params.get("authorId") ?? "";
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
    const categoryOptions = [
        {id: UNCATEGORIZED_CATEGORY_TOKEN, title: catalogT("category.general", "General")},
        ...catalogCategories
    ];
    catalogCategoryNode.innerHTML = `
        <option value="">${catalogT("projects.allCategories", "All categories")}</option>
        ${categoryOptions.map((category) => `<option value="${category.id}">${escapeCatalogHtml(translateCatalogCategoryTitle(category.title))}</option>`).join("")}
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
        if (catalogPageState.categoryId === UNCATEGORIZED_CATEGORY_TOKEN) {
            url.searchParams.set("uncategorized", "true");
        } else {
            url.searchParams.set("categoryId", catalogPageState.categoryId);
        }
    }
    url.searchParams.delete("uncategorized");
    if (catalogPageState.categoryId === UNCATEGORIZED_CATEGORY_TOKEN) {
        url.searchParams.set("uncategorized", "true");
    }
    if (catalogPageState.authorId) {
        url.searchParams.set("authorId", catalogPageState.authorId);
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
        const coverMarkup = renderCatalogProjectCover(project, "project-card-cover");
        return `
            <article class="project-card">
                <div class="project-card-media">
                    ${coverMarkup}
                </div>
                <div class="project-card-content">
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
                        <div class="project-card-badges">
                            <span class="status-badge">${escapeCatalogHtml(formatCatalogProjectStatus(project.status ?? catalogPageState.status))}</span>
                            <span class="meta-pill">${escapeCatalogHtml(translateCatalogCategoryTitle(project.categoryTitle))}</span>
                        </div>
                        <div class="project-card-footer-actions">
                            <a class="ghost-btn" href="/project.html?id=${project.id}">${catalogT("app.openPage", "Open page")}</a>
                            <button class="ghost-btn" type="button" data-project-id="${project.id}">${catalogT("app.quickView", "Quick view")}</button>
                        </div>
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
    const coverMarkup = renderCatalogProjectCover(project, "project-modal-cover");
    document.getElementById("modal-body").innerHTML = `
        <p class="panel-kicker">${escapeCatalogHtml(translateCatalogCategoryTitle(project.categoryTitle, "app.project", "Project"))}</p>
        <div class="project-modal-hero">
            ${coverMarkup}
            <div class="project-modal-copy">
                <h3>${escapeCatalogHtml(project.title)}</h3>
                <p class="modal-copy">${escapeCatalogHtml(project.description || project.shortDescription || "")}</p>
            </div>
        </div>
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

    const chipCategories = [
        {id: UNCATEGORIZED_CATEGORY_TOKEN, title: catalogT("category.general", "General")},
        ...catalogCategories.slice(0, 7)
    ];

    catalogChipRowNode.innerHTML = chipCategories.map((category) => {
        const active = String(category.id) === String(catalogPageState.categoryId);
        return `
            <button class="catalog-chip${active ? " active" : ""}" type="button" data-category-id="${category.id}">
                ${escapeCatalogHtml(translateCatalogCategoryTitle(category.title))}
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
    catalogPrevNode.textContent = window.AppI18n.t("projects.prev");
    catalogNextNode.textContent = window.AppI18n.t("projects.next");
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
        if (catalogPageState.categoryId === UNCATEGORIZED_CATEGORY_TOKEN) {
            params.delete("categoryId");
            params.set("uncategorized", "true");
        } else {
            params.set("categoryId", catalogPageState.categoryId);
            params.delete("uncategorized");
        }
    } else {
        params.delete("categoryId");
        params.delete("uncategorized");
    }

    if (catalogPageState.authorId) {
        params.set("authorId", catalogPageState.authorId);
    } else {
        params.delete("authorId");
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

function renderCatalogProjectCover(project, className) {
    if (project?.hasCoverImage && project?.id) {
        return `<img class="${className} project-cover-image" src="/api/projects/${encodeURIComponent(project.id)}/image" alt="${escapeCatalogHtml(project.title ?? "Project")}">`;
    }

    const category = translateCatalogCategoryTitle(project?.categoryTitle, "app.project", "Project");
    const initials = getCatalogProjectInitials(project?.title);
    const tone = getCatalogProjectCoverTone(project);

    return `
        <div class="${className} ${tone}">
            <div class="project-cover-glow"></div>
            <div class="project-cover-copy">
                <strong>${escapeCatalogHtml(initials)}</strong>
                <span>${escapeCatalogHtml(category)}</span>
            </div>
        </div>
    `;
}

function getCatalogProjectInitials(title) {
    const parts = String(title ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
        return "PR";
    }

    return parts
        .slice(0, 2)
        .map((part) => Array.from(part)[0] ?? "")
        .join("")
        .toUpperCase();
}

function getCatalogProjectCoverTone(project) {
    const source = `${project?.categoryTitle ?? ""}:${project?.title ?? ""}`;
    const tones = ["cover-violet", "cover-sky", "cover-green", "cover-amber", "cover-coral"];
    let hash = 0;

    for (const symbol of source) {
        hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    }

    return tones[hash % tones.length];
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

function formatCatalogProjectStatus(status) {
    return catalogT(`project.status.${status}`, status || "UNKNOWN");
}

function translateCatalogCategoryTitle(title, fallbackKey = "app.general", fallbackText = "General") {
    const normalized = String(title ?? "").trim().toLowerCase();
    const key = CATALOG_CATEGORY_TRANSLATION_KEYS[normalized];
    return key ? catalogT(key, title) : (title || catalogT(fallbackKey, fallbackText));
}

function resolveCatalogLocale() {
    return catalogI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}

const CATALOG_CATEGORY_TRANSLATION_KEYS = {
    "general": "category.general",
    "\u043e\u0431\u0449\u0435\u0435": "category.general",
    "\u0442\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0438": "category.tech",
    "technology": "category.tech",
    "technologies": "category.tech",
    "\u0442\u0432\u043e\u0440\u0447\u0435\u0441\u0442\u0432\u043e": "category.art",
    "art": "category.art",
    "\u0441\u043e\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u044b": "category.social",
    "social": "category.social",
    "social projects": "category.social",
    "\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435": "category.education",
    "education": "category.education",
    "\u0431\u043b\u0430\u0433\u043e\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c": "category.charity",
    "charity": "category.charity"
};
