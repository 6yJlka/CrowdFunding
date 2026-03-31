const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
});

let catalogQuery = "";
let currentTopProjects = [];
let currentFounders = [];

wireStaticActions();
loadDashboard();

async function loadDashboard() {
    try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
            throw new Error(`Dashboard request failed: ${response.status}`);
        }

        const data = await response.json();
        currentTopProjects = data.topProjects ?? [];
        currentFounders = data.recentFounders ?? [];
        renderDashboard(data);
        await loadCatalog();
    } catch (error) {
        renderError(error);
    }
}

function renderDashboard(data) {
    setText("total-raised", formatMoney(data.totalRaised));
    setText("active-projects", `${data.activeProjects ?? 0}`);
    setText("total-backers", `${data.totalBackers ?? 0}`);
    setText("funded-projects", `${data.fundedProjects ?? 0}`);

    renderCategoryTags(currentTopProjects);
    renderFounderAvatars(currentFounders);
    renderChart(data.monthlyRaised ?? []);
    renderTopProjects(currentTopProjects);
    renderFounders(currentFounders);
}

function renderCategoryTags(topProjects) {
    const container = document.getElementById("category-tags");
    const tags = [...new Set(topProjects.map((project) => project.categoryTitle).filter(Boolean))].slice(0, 2);
    container.innerHTML = tags.length
        ? tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")
        : "<span>No data</span>";
}

function renderFounderAvatars(founders) {
    const container = document.getElementById("founder-avatars");
    container.innerHTML = founders.length
        ? founders.slice(0, 5).map((founder, index) => `
            <span class="founder-badge" data-founder-index="${index}" title="${escapeHtml(founder.authorDisplayName)}">${getInitials(founder.authorDisplayName)}</span>
        `).join("")
        : "<span>--</span>";
}

function renderChart(points) {
    const labelsContainer = document.getElementById("chart-months");
    const linePath = document.getElementById("chart-line-path");
    const areaPath = document.getElementById("chart-area-path");
    const point = document.getElementById("chart-point");

    if (!points.length) {
        labelsContainer.innerHTML = "<span>No data</span>";
        linePath.setAttribute("d", "");
        areaPath.setAttribute("d", "");
        point.setAttribute("cx", "0");
        point.setAttribute("cy", "0");
        setText("chart-callout", "$0");
        updateAxis(0);
        return;
    }

    labelsContainer.innerHTML = points.map((pointItem) => `<span>${escapeHtml(pointItem.label)}</span>`).join("");
    const values = points.map((pointItem) => Number(pointItem.amount ?? 0));
    const maxValue = Math.max(...values, 1);
    updateAxis(maxValue);

    const width = 800;
    const leftPadding = 10;
    const bottomY = 290;
    const stepX = points.length > 1 ? (width - 20) / (points.length - 1) : 0;

    const coordinates = values.map((value, index) => {
        const x = leftPadding + stepX * index;
        const y = bottomY - (value / maxValue) * 240;
        return {x, y};
    });

    const lineD = coordinates.map((coordinate, index) =>
        `${index === 0 ? "M" : "L"}${coordinate.x},${coordinate.y}`
    ).join(" ");
    const areaD = `${lineD} L${coordinates[coordinates.length - 1].x},320 L${coordinates[0].x},320 Z`;

    linePath.setAttribute("d", lineD);
    areaPath.setAttribute("d", areaD);

    const lastPoint = coordinates[coordinates.length - 1];
    point.setAttribute("cx", `${lastPoint.x}`);
    point.setAttribute("cy", `${lastPoint.y}`);
    setText("chart-callout", formatCompactMoney(values[values.length - 1]));
}

function updateAxis(maxValue) {
    setText("axis-max", formatCompactMoney(maxValue));
    setText("axis-75", formatCompactMoney(maxValue * 0.75));
    setText("axis-50", formatCompactMoney(maxValue * 0.5));
    setText("axis-25", formatCompactMoney(maxValue * 0.25));
}

function renderTopProjects(projects) {
    const body = document.getElementById("top-projects-table");
    body.innerHTML = projects.length
        ? projects.map((project, index) => `
            <tr class="interactive-row" data-project-id="${project.id}">
                <td>${index + 1}</td>
                <td>
                    <strong>${escapeHtml(project.title)}</strong>
                    <div class="table-subtitle">${escapeHtml(project.categoryTitle ?? "General")} · ${escapeHtml(formatCompactMoney(project.collectedAmount))}</div>
                </td>
                <td>${escapeHtml(project.authorDisplayName ?? "Unknown")}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No campaigns available</td></tr>`;
}

function renderFounders(founders) {
    const grid = document.getElementById("founders-grid");
    const avatarThemes = ["cyan", "amber", "green", "coral", "blue", "violet"];

    grid.innerHTML = founders.length
        ? founders.map((founder, index) => `
            <a class="investor-card founder-link" href="/author-dashboard.html" title="${escapeHtml(founder.authorDisplayName ?? "Unknown")}">
                <span class="investor-avatar ${avatarThemes[index % avatarThemes.length]}">${getInitials(founder.authorDisplayName)}</span>
                <strong>${escapeHtml(founder.authorDisplayName ?? "Unknown")}</strong>
                <p>${escapeHtml(founder.projectTitle ?? "No project")}</p>
            </a>
        `).join("")
        : `<article class="investor-card"><strong>No founders yet</strong><p>Create a project to populate this block.</p></article>`;
}

async function loadCatalog(query = catalogQuery) {
    catalogQuery = query;
    const url = new URL("/api/projects", window.location.origin);
    url.searchParams.set("size", "9");
    url.searchParams.set("sort", "createdAt,desc");
    if (query.trim()) {
        url.searchParams.set("q", query.trim());
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Catalog request failed: ${response.status}`);
    }

    const payload = await response.json();
    renderCatalog(payload.content ?? []);
}

function renderCatalog(projects) {
    const grid = document.getElementById("project-grid");
    if (!projects.length) {
        grid.innerHTML = `<div class="empty-state">No active campaigns found for this query.</div>`;
        return;
    }

    grid.innerHTML = projects.map((project) => {
        const percent = getProgress(project.collectedAmount, project.goalAmount);
        return `
            <article class="project-card">
                <div class="project-card-header">
                    <span class="status-badge">${escapeHtml(project.status ?? "ACTIVE")}</span>
                    <span class="meta-pill">${escapeHtml(project.categoryTitle ?? "General")}</span>
                </div>
                <h4>${escapeHtml(project.title)}</h4>
                <p>${escapeHtml(project.shortDescription ?? "")}</p>
                <div class="project-meta">
                    <span>${escapeHtml(project.authorDisplayName ?? "Unknown author")}</span>
                    <span>${formatMoney(project.goalAmount)}</span>
                </div>
                <div class="project-progress">
                    <div class="project-progress-head">
                        <span>${formatMoney(project.collectedAmount)} raised</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-value" style="width:${Math.min(percent, 100)}%"></div>
                    </div>
                </div>
                <div class="project-card-footer">
                    <strong>${escapeHtml(project.currency ?? "USD")}</strong>
                    <div class="project-card-footer-actions">
                        <a class="ghost-btn" href="/project.html?id=${project.id}">Open page</a>
                        <button class="ghost-btn" type="button" data-project-id="${project.id}">Quick view</button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

async function openProjectModal(projectId) {
    const modal = document.getElementById("project-modal");
    const body = document.getElementById("modal-body");
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    body.innerHTML = `<p class="panel-kicker">Project</p><h3>Loading...</h3><p class="modal-copy">Fetching project details.</p>`;

    try {
        const [projectResponse, reviewsResponse] = await Promise.all([
            fetch(`/api/projects/${projectId}`),
            fetch(`/api/projects/${projectId}/reviews`)
        ]);

        if (!projectResponse.ok) {
            throw new Error(`Project request failed: ${projectResponse.status}`);
        }

        const project = await projectResponse.json();
        const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];
        renderProjectModal(project, reviews);
    } catch (error) {
        body.innerHTML = `<p class="panel-kicker">Project</p><h3>Unavailable</h3><p class="modal-copy">Could not load this campaign.</p>`;
        console.error(error);
    }
}

function renderProjectModal(project, reviews) {
    const percent = getProgress(project.collectedAmount, project.goalAmount);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <p class="panel-kicker">${escapeHtml(project.categoryTitle ?? "Project")}</p>
        <h3>${escapeHtml(project.title)}</h3>
        <p class="modal-copy">${escapeHtml(project.description || project.shortDescription || "")}</p>
        <div class="modal-metrics">
            <div class="metric-box">
                <span>Raised</span>
                <strong>${formatMoney(project.collectedAmount)}</strong>
            </div>
            <div class="metric-box">
                <span>Goal</span>
                <strong>${formatMoney(project.goalAmount)}</strong>
            </div>
            <div class="metric-box">
                <span>Progress</span>
                <strong>${percent}%</strong>
            </div>
            <div class="metric-box">
                <span>Author</span>
                <strong>${escapeHtml(project.authorDisplayName ?? "Unknown")}</strong>
            </div>
        </div>
        <div class="project-progress">
            <div class="project-progress-head">
                <span>Funding status</span>
                <span>${percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-value" style="width:${Math.min(percent, 100)}%"></div>
            </div>
        </div>
        <div class="project-card-footer project-modal-actions">
            <a class="primary-btn small-btn" href="/project.html?id=${project.id}">Open full page</a>
        </div>
        <div class="review-list">
            ${reviews.length ? reviews.map((review) => `
                <article class="review-card">
                    <div class="review-head">
                        <strong>${escapeHtml(review.userDisplayName ?? "Anonymous")}</strong>
                        <span class="review-rating">${"★".repeat(review.rating || 0)}</span>
                    </div>
                    <p>${escapeHtml(review.reviewText ?? "")}</p>
                </article>
            `).join("") : `<div class="empty-state">No reviews yet for this campaign.</div>`}
        </div>
    `;
}

function closeProjectModal() {
    const modal = document.getElementById("project-modal");
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
}

function renderError(error) {
    console.error(error);
    setText("total-raised", "Unavailable");
    setText("active-projects", "-");
    setText("total-backers", "-");
    setText("funded-projects", "-");
}

function formatMoney(value) {
    return currencyFormatter.format(Number(value ?? 0));
}

function formatCompactMoney(value) {
    return `$${compactNumberFormatter.format(Number(value ?? 0))}`;
}

function getProgress(collectedAmount, goalAmount) {
    const collected = Number(collectedAmount ?? 0);
    const goal = Number(goalAmount ?? 0);
    if (!goal) {
        return 0;
    }
    return Math.round((collected / goal) * 100);
}

function getInitials(name) {
    return (name ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "--";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function wireStaticActions() {
    const runCatalogSearchDebounced = debounce((value) => {
        loadCatalog(value).catch(renderError);
    }, 250);
    const runLeaderboardSearchDebounced = debounce(handleLeaderboardSearch, 150);

    document.getElementById("catalog-search-btn").addEventListener("click", () => {
        loadCatalog(document.getElementById("catalog-search").value).catch(renderError);
    });

    document.getElementById("catalog-search").addEventListener("input", (event) => {
        runCatalogSearchDebounced(event.target.value);
    });

    document.getElementById("catalog-search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            loadCatalog(event.target.value).catch(renderError);
        }
    });

    document.getElementById("global-search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const value = event.target.value.trim();
            if (value) {
                document.getElementById("catalog-search").value = value;
                document.getElementById("active-campaigns").scrollIntoView({behavior: "smooth", block: "start"});
                loadCatalog(value).catch(renderError);
            }
        }
    });

    document.getElementById("leaderboard-search-btn").addEventListener("click", handleLeaderboardSearch);
    document.getElementById("leaderboard-search").addEventListener("input", () => {
        runLeaderboardSearchDebounced();
    });
    document.getElementById("leaderboard-search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            handleLeaderboardSearch();
        }
    });

    document.querySelectorAll(".clickable-card").forEach((card) => {
        card.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }
            runCardAction(card.dataset);
        });
    });

    document.querySelectorAll("[data-nav], [data-scroll-target]").forEach((control) => {
        control.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            runCardAction(control.dataset);
        });
    });

    document.getElementById("project-grid").addEventListener("click", (event) => {
        const button = event.target.closest("[data-project-id]");
        if (!button) {
            return;
        }
        openProjectModal(button.getAttribute("data-project-id"));
    });

    document.getElementById("top-projects-table").addEventListener("click", (event) => {
        const row = event.target.closest("[data-project-id]");
        if (!row) {
            return;
        }
        window.location.href = `/project.html?id=${row.getAttribute("data-project-id")}`;
    });

    document.getElementById("founder-avatars").addEventListener("click", (event) => {
        const founder = event.target.closest("[data-founder-index]");
        if (!founder) {
            return;
        }
        document.getElementById("new-founders").scrollIntoView({behavior: "smooth", block: "start"});
    });

    document.getElementById("modal-close").addEventListener("click", closeProjectModal);
    document.getElementById("modal-backdrop").addEventListener("click", closeProjectModal);

    const sectionMap = [
        {id: "overview-chart", menuHref: "/"},
        {id: "top-campaigns", menuHref: "#top-campaigns"},
        {id: "new-founders", menuHref: "#new-founders"},
        {id: "active-campaigns", menuHref: "#active-campaigns"}
    ];

    const observer = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
            return;
        }

        const section = sectionMap.find((item) => item.id === visible.target.id);
        if (!section) {
            return;
        }

        document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
        const activeLink = [...document.querySelectorAll(".menu-item")].find((item) => item.getAttribute("href") === section.menuHref);
        if (activeLink) {
            activeLink.classList.add("active");
        }
    }, {threshold: 0.35});

    sectionMap.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
            observer.observe(element);
        }
    });
}

function handleLeaderboardSearch() {
    const value = document.getElementById("leaderboard-search").value.trim().toLowerCase();
    if (!value) {
        renderTopProjects(currentTopProjects);
        return;
    }

    const filtered = currentTopProjects.filter((project) =>
        `${project.title ?? ""} ${project.authorDisplayName ?? ""} ${project.categoryTitle ?? ""}`.toLowerCase().includes(value)
    );
    renderTopProjects(filtered);
}

function runCardAction(dataset) {
    if (dataset.nav) {
        window.location.href = dataset.nav;
        return;
    }

    if (dataset.scrollTarget) {
        const target = document.getElementById(dataset.scrollTarget);
        if (target) {
            target.scrollIntoView({behavior: "smooth", block: "start"});
        }
    }
}

function debounce(callback, delayMs) {
    let timeoutId;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delayMs);
    };
}
