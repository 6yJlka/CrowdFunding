const catalogI18n = window.AppI18n;
const catalogPresentation = window.RiseUpProjects;
const UNCATEGORIZED_CATEGORY_TOKEN = "__uncategorized__";
const catalogPageState = {
    query: "", categoryId: "", authorId: "", sort: "createdAt,desc", page: 0, size: 9,
    status: "ACTIVE", totalPages: 0, totalElements: 0
};
const catalogGridNode = document.getElementById("catalog-page-grid");
const catalogStatusNode = document.getElementById("catalog-page-status");
const catalogSearchNode = document.getElementById("catalog-page-search");
const catalogSortNode = document.getElementById("catalog-sort-filter");
const catalogChipRowNode = document.getElementById("catalog-chip-row");
const catalogPrevNode = document.getElementById("catalog-prev-btn");
const catalogNextNode = document.getElementById("catalog-next-btn");
let catalogCategories = [];
let currentCatalogProjects = [];
let catalogRequestVersion = 0;
let catalogLoaded = false;
let catalogErrorKey = "";
let catalogCategoriesError = false;
let catalogSearchTimeout;

hydrateCatalogStateFromUrl();
wireCatalogPageEvents();
syncCatalogTabs();
renderCatalogChips();
updateCatalogPagination();
loadCatalogCategories().catch(() => {
    catalogCategoriesError = true;
    setCatalogPageStatus("catalog.error.categories", true);
});
loadCatalogPageProjects();

document.addEventListener("app:lang-changed", () => {
    renderCatalogChips();
    syncCatalogTabs();
    renderCatalogPageProjects();
    updateCatalogPagination();
    updateCatalogCount();
    setCatalogPageStatus(catalogErrorKey || (catalogCategoriesError ? "catalog.error.categories" : catalogLoaded ? "" : "catalog.loading"), Boolean(catalogErrorKey || catalogCategoriesError));
});
window.addEventListener("popstate", () => {
    window.clearTimeout(catalogSearchTimeout);
    hydrateCatalogStateFromUrl();
    syncCatalogTabs();
    renderCatalogChips();
    loadCatalogPageProjects();
});

function hydrateCatalogStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    catalogPageState.query = params.get("q")?.trim() ?? "";
    catalogPageState.categoryId = params.get("uncategorized") === "true" ? UNCATEGORIZED_CATEGORY_TOKEN : (params.get("categoryId") ?? "");
    catalogPageState.authorId = params.get("authorId") ?? "";
    const sort = params.get("sort") ?? "createdAt,desc";
    catalogPageState.sort = [...catalogSortNode.options].some((option) => option.value === sort) ? sort : "createdAt,desc";
    const page = Number(params.get("page") ?? 0);
    catalogPageState.page = Number.isSafeInteger(page) && page > 0 ? page : 0;
    catalogPageState.status = params.get("status") === "FUNDED" ? "FUNDED" : "ACTIVE";
    catalogSearchNode.value = catalogPageState.query;
    catalogSortNode.value = catalogPageState.sort;
}

function wireCatalogPageEvents() {
    document.getElementById("catalog-search-form").addEventListener("submit", (event) => {
        event.preventDefault();
        submitCatalogSearch();
    });
    catalogSearchNode.addEventListener("input", () => {
        window.clearTimeout(catalogSearchTimeout);
        catalogSearchTimeout = window.setTimeout(submitCatalogSearch, 250);
    });
    catalogSortNode.addEventListener("change", () => {
        catalogPageState.sort = catalogSortNode.value;
        catalogPageState.page = 0;
        loadCatalogPageProjects();
    });
    catalogChipRowNode.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-category-id]");
        if (!chip) return;
        catalogPageState.categoryId = chip.dataset.categoryId;
        catalogPageState.page = 0;
        renderCatalogChips();
        loadCatalogPageProjects();
    });
    const tabs = document.getElementById("catalog-status-tabs");
    tabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-catalog-status]");
        if (button) setCatalogStatus(button.dataset.catalogStatus);
    });
    tabs.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const status = event.key === "Home" ? "ACTIVE" : event.key === "End" ? "FUNDED" : catalogPageState.status === "ACTIVE" ? "FUNDED" : "ACTIVE";
        setCatalogStatus(status);
        tabs.querySelector(`[data-catalog-status="${status}"]`).focus();
    });
    catalogPrevNode.addEventListener("click", () => {
        if (catalogPageState.page > 0) { catalogPageState.page -= 1; loadCatalogPageProjects(); }
    });
    catalogNextNode.addEventListener("click", () => {
        if (catalogPageState.page < catalogPageState.totalPages - 1) { catalogPageState.page += 1; loadCatalogPageProjects(); }
    });
}

function submitCatalogSearch() {
    window.clearTimeout(catalogSearchTimeout);
    catalogPageState.query = catalogSearchNode.value.trim();
    catalogPageState.page = 0;
    loadCatalogPageProjects();
}

function setCatalogStatus(status) {
    if (catalogPageState.status === status) return;
    catalogPageState.status = status;
    catalogPageState.page = 0;
    syncCatalogTabs();
    loadCatalogPageProjects();
}

function syncCatalogTabs() {
    document.querySelectorAll("[data-catalog-status]").forEach((button) => {
        const active = button.dataset.catalogStatus === catalogPageState.status;
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
        if (active) document.getElementById("catalog-results").setAttribute("aria-labelledby", button.id);
    });
}

async function loadCatalogCategories() {
    const response = await fetch("/api/categories");
    if (!response.ok) throw new Error("categories");
    catalogCategories = await response.json();
    renderCatalogChips();
    if (catalogLoaded) renderCatalogPageProjects();
}

async function loadCatalogPageProjects() {
    const version = ++catalogRequestVersion;
    catalogLoaded = false;
    catalogErrorKey = "";
    currentCatalogProjects = [];
    catalogGridNode.replaceChildren();
    catalogGridNode.setAttribute("aria-busy", "true");
    document.getElementById("catalog-result-count").textContent = "";
    setCatalogPageStatus("catalog.loading");
    catalogPrevNode.disabled = true;
    catalogNextNode.disabled = true;
    syncCatalogUrl();
    const url = new URL("/api/projects", window.location.origin);
    url.search = window.location.search;
    url.searchParams.set("size", String(catalogPageState.size));
    url.searchParams.set("page", String(catalogPageState.page));
    url.searchParams.set("status", catalogPageState.status);
    url.searchParams.set("sort", catalogPageState.sort);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("projects");
        const payload = await response.json();
        if (version !== catalogRequestVersion) return;
        catalogPageState.totalPages = payload.totalPages ?? 0;
        catalogPageState.totalElements = payload.totalElements ?? 0;
        currentCatalogProjects = payload.content ?? [];
        catalogLoaded = true;
        // An old bookmark may reference a page that no longer exists after projects change status.
        if (catalogPageState.page > 0 && catalogPageState.page >= Math.max(catalogPageState.totalPages, 1)) {
            catalogPageState.page = Math.max(catalogPageState.totalPages - 1, 0);
            return loadCatalogPageProjects();
        }
        renderCatalogPageProjects();
        updateCatalogPagination();
        updateCatalogCount();
        setCatalogPageStatus(catalogCategoriesError ? "catalog.error.categories" : "", catalogCategoriesError);
    } catch {
        if (version !== catalogRequestVersion) return;
        catalogErrorKey = "catalog.error.load";
        setCatalogPageStatus(catalogErrorKey, true);
    } finally {
        if (version === catalogRequestVersion) catalogGridNode.setAttribute("aria-busy", "false");
    }
}

function renderCatalogPageProjects() {
    if (!catalogLoaded) return;
    catalogGridNode.innerHTML = currentCatalogProjects.length
        ? currentCatalogProjects.map((project) => catalogPresentation.renderCard(project, catalogCategories)).join("")
        : `<div class="empty-state">${catalogPresentation.escapeHtml(catalogI18n.t("catalog.empty"))}</div>`;
}

function renderCatalogChips() {
    const categories = [{id: "", title: catalogI18n.t("projects.allCategories")},
        {id: UNCATEGORIZED_CATEGORY_TOKEN, title: catalogI18n.t("category.general")}, ...catalogCategories];
    catalogChipRowNode.innerHTML = categories.map((category) => {
        const title = category.slug ? catalogPresentation.categoryTitle({categoryId: category.id}, catalogCategories) : category.title;
        return `<button class="chip" type="button" data-category-id="${catalogPresentation.escapeHtml(category.id)}" aria-pressed="${String(category.id) === catalogPageState.categoryId}">${catalogPresentation.escapeHtml(title)}</button>`;
    }).join("");
}

function updateCatalogPagination() {
    document.getElementById("catalog-pagination-copy").textContent = catalogI18n.t("catalog.pageOf")
        .replace("{page}", String(catalogPageState.page + 1)).replace("{total}", String(Math.max(catalogPageState.totalPages, 1)));
    catalogPrevNode.disabled = !catalogLoaded || catalogPageState.page <= 0;
    catalogNextNode.disabled = !catalogLoaded || catalogPageState.page >= Math.max(catalogPageState.totalPages - 1, 0);
}

function updateCatalogCount() {
    document.getElementById("catalog-result-count").innerHTML = catalogLoaded
        ? catalogPresentation.escapeHtml(catalogI18n.t("catalog.found"))
            .replace("{count}", `<b>${catalogPresentation.escapeHtml(catalogPageState.totalElements)}</b>`) : "";
}

function syncCatalogUrl() {
    const params = new URLSearchParams();
    if (catalogPageState.query) params.set("q", catalogPageState.query);
    if (catalogPageState.categoryId === UNCATEGORIZED_CATEGORY_TOKEN) params.set("uncategorized", "true");
    else if (catalogPageState.categoryId) params.set("categoryId", catalogPageState.categoryId);
    if (catalogPageState.authorId) params.set("authorId", catalogPageState.authorId);
    params.set("status", catalogPageState.status);
    if (catalogPageState.sort !== "createdAt,desc") params.set("sort", catalogPageState.sort);
    if (catalogPageState.page > 0) params.set("page", String(catalogPageState.page));
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
}

function setCatalogPageStatus(key, error = false) {
    catalogStatusNode.hidden = !key;
    catalogStatusNode.textContent = key ? catalogI18n.t(key) : "";
    catalogStatusNode.classList.toggle("page-message-error", error);
    catalogStatusNode.setAttribute("role", error ? "alert" : "status");
}
