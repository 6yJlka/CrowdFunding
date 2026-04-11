const appI18n = window.AppI18n;

let catalogQuery = "";
let currentTopProjects = [];
let currentFounders = [];
let currentSponsors = [];
let currentDashboardData = null;
let currentCatalogProjects = [];
let currentModalProject = null;
let currentModalReviews = [];

wireStaticActions();
loadDashboard();
document.addEventListener("app:lang-changed", () => {
    if (currentDashboardData) {
        renderDashboard(currentDashboardData);
    }
    renderCatalog(currentCatalogProjects);
    if (currentModalProject) {
        renderProjectModal(currentModalProject, currentModalReviews);
    }
});

async function loadDashboard() {
    try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
            throw new Error(`Dashboard request failed: ${response.status}`);
        }

        const data = await response.json();
        currentDashboardData = data;
        currentTopProjects = data.topProjects ?? [];
        currentFounders = data.recentFounders ?? [];
        currentSponsors = data.recentSponsors ?? [];
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

    renderCategoryTags(currentCatalogProjects);
    renderSponsorAvatars(currentSponsors, Number(data.totalBackers ?? 0));
    renderChart(data.monthlyRaised ?? []);
    renderTopProjects(currentTopProjects);
    renderFounders(currentFounders);
}

function renderCategoryTags(projects) {
    const container = document.getElementById("category-tags");
    const counts = new Map();
    projects.forEach((project) => {
        const category = String(project?.categoryTitle ?? "").trim();
        if (!category) {
            return;
        }
        counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    const tags = [...counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([category]) => category);

    container.innerHTML = tags.length
        ? tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")
        : `<span>${appT("app.noData", "No data")}</span>`;
}

function renderSponsorAvatars(sponsors, totalBackers = sponsors.length) {
    const container = document.getElementById("founder-avatars");
    if (!sponsors.length) {
        container.innerHTML = "<span>--</span>";
        return;
    }

    const visibleSponsors = sponsors.slice(0, 5);
    const remainingCount = Math.max(totalBackers - visibleSponsors.length, 0);

    container.innerHTML = `
        ${visibleSponsors.map((sponsor, index) => `
            <span class="avatar-stack-item founder-badge" data-sponsor-index="${index}" title="${escapeHtml(sponsor.sponsorDisplayName)}">
                ${renderDashboardSponsorAvatar(sponsor)}
            </span>
        `).join("")}
        ${remainingCount > 0 ? `<span class="avatar-stack-item founder-badge founder-badge-more" title="${escapeHtml(`More sponsors: ${remainingCount}`)}">+${remainingCount}</span>` : ""}
    `;
}

function renderChart(points) {
    const labelsContainer = document.getElementById("chart-months");
    const linePath = document.getElementById("chart-line-path");
    const areaPath = document.getElementById("chart-area-path");
    const point = document.getElementById("chart-point");
    const callout = document.getElementById("chart-callout");
    const rangeBadge = document.getElementById("chart-range-badge");

    if (!points.length) {
        labelsContainer.innerHTML = `<span>${appT("app.noData", "No data")}</span>`;
        labelsContainer.style.gridTemplateColumns = "1fr";
        linePath.setAttribute("d", "");
        areaPath.setAttribute("d", "");
        point.setAttribute("cx", "0");
        point.setAttribute("cy", "0");
        setText("chart-callout", formatCompactMoney(0));
        positionChartCallout(callout, 400, 128, 800, 320);
        rangeBadge.textContent = appT("index.chart.emptyRange", "No data yet");
        updateAxis(0, 0);
        return;
    }

    labelsContainer.style.gridTemplateColumns = `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`;
    labelsContainer.innerHTML = buildChartLabels(points);
    rangeBadge.textContent = formatChartRangeBadge(points[0].label);

    const values = points.map((pointItem) => Number(pointItem.amount ?? 0));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);
    const visualPadding = Math.max((maxValue - minValue) * 0.18, maxValue * 0.08, 1);
    const displayMin = Math.max(0, minValue - visualPadding);
    const displayMax = maxValue + visualPadding;
    updateAxis(displayMin, displayMax);

    const width = 800;
    const leftPadding = 12;
    const rightPadding = 12;
    const topY = 18;
    const bottomY = 294;
    const drawableHeight = bottomY - topY;
    const stepX = points.length > 1 ? (width - leftPadding - rightPadding) / (points.length - 1) : 0;

    const coordinates = values.map((value, index) => {
        const x = leftPadding + stepX * index;
        const ratio = displayMax === displayMin ? 0.5 : (value - displayMin) / (displayMax - displayMin);
        const y = bottomY - Math.max(0, Math.min(1, ratio)) * drawableHeight;
        return {x, y};
    });

    const lineD = buildSmoothLinePath(coordinates);
    const areaD = `${lineD} L${coordinates[coordinates.length - 1].x},${bottomY} L${coordinates[0].x},${bottomY} Z`;

    linePath.setAttribute("d", lineD);
    areaPath.setAttribute("d", areaD);

    const lastPoint = coordinates[coordinates.length - 1];
    point.setAttribute("cx", `${lastPoint.x}`);
    point.setAttribute("cy", `${lastPoint.y}`);
    setText("chart-callout", formatCompactMoney(values[values.length - 1]));
    positionChartCallout(callout, lastPoint.x, lastPoint.y, width, 320);
}

function updateAxis(minValue, maxValue) {
    const range = Math.max(maxValue - minValue, 1);
    setText("axis-max", formatCompactMoney(maxValue));
    setText("axis-75", formatCompactMoney(minValue + range * 0.75));
    setText("axis-50", formatCompactMoney(minValue + range * 0.5));
    setText("axis-25", formatCompactMoney(minValue + range * 0.25));
    setText("axis-min", formatCompactMoney(minValue));
}

function renderTopProjects(projects) {
    const body = document.getElementById("top-projects-table");
    body.innerHTML = projects.length
        ? projects.map((project, index) => `
            <tr class="interactive-row" data-project-id="${project.id}">
                <td>${index + 1}</td>
                <td>
                    <strong>${escapeHtml(project.title)}</strong>
                    <div class="table-subtitle">${escapeHtml(project.categoryTitle ?? appT("app.general", "General"))} · ${escapeHtml(formatCompactMoney(project.collectedAmount))}</div>
                </td>
                <td>${escapeHtml(project.authorDisplayName ?? appT("app.unknown", "Unknown"))}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">${appT("app.noCampaigns", "No campaigns available")}</td></tr>`;
}

function renderFounders(founders) {
    const grid = document.getElementById("founders-grid");

    grid.innerHTML = founders.length
        ? founders.map((founder) => `
            <a class="investor-card founder-link" href="/projects.html?authorId=${encodeURIComponent(founder.authorId ?? "")}" title="${escapeHtml(founder.authorDisplayName ?? appT("app.unknown", "Unknown"))}">
                ${renderDashboardFounderAvatar(founder, "investor-avatar investor-avatar-image", "investor-avatar investor-avatar-fallback")}
                <strong>${escapeHtml(founder.authorDisplayName ?? appT("app.unknown", "Unknown"))}</strong>
            </a>
        `).join("")
        : `<article class="investor-card"><strong>${appT("app.noFounders", "No founders yet")}</strong><p>${appT("app.createProjectHint", "Create a project to populate this block.")}</p></article>`;
}

function renderDashboardFounderAvatar(founder, imageClassName, fallbackClassName) {
    const displayName = founder.authorDisplayName ?? appT("app.unknown", "Unknown");
    if (founder.hasAvatar && founder.authorId) {
        return `<img class="${imageClassName}" src="/api/showcase/founders/${encodeURIComponent(founder.authorId)}/avatar" alt="${escapeHtml(displayName)}">`;
    }
    return `<span class="${fallbackClassName}">${getInitials(displayName)}</span>`;
}

function renderDashboardSponsorAvatar(sponsor) {
    const displayName = sponsor.sponsorDisplayName ?? appT("app.unknown", "Unknown");
    if (sponsor.hasAvatar && sponsor.sponsorId) {
        return `<img class="founder-badge-image" src="/api/showcase/sponsors/${encodeURIComponent(sponsor.sponsorId)}/avatar" alt="${escapeHtml(displayName)}">`;
    }
    return `<span class="founder-badge-fallback">${getInitials(displayName)}</span>`;
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
    currentCatalogProjects = payload.content ?? [];
    renderCatalog(currentCatalogProjects);
    renderCategoryTags(currentCatalogProjects);
}

function renderCatalog(projects) {
    const grid = document.getElementById("project-grid");
    if (!projects.length) {
        grid.innerHTML = `<div class="empty-state">${appT("app.noActiveForQuery", "No active campaigns found for this query.")}</div>`;
        return;
    }

    grid.innerHTML = projects.map((project) => {
        const percent = getProgress(project.collectedAmount, project.goalAmount);
        return `
            <article class="project-card">
                <div class="project-card-header">
                    <span class="status-badge">${escapeHtml(project.status ?? "ACTIVE")}</span>
                    <span class="meta-pill">${escapeHtml(project.categoryTitle ?? appT("app.general", "General"))}</span>
                </div>
                <h4>${escapeHtml(project.title)}</h4>
                <p>${escapeHtml(project.shortDescription ?? "")}</p>
                <div class="project-meta">
                    <span>${escapeHtml(project.authorDisplayName ?? appT("app.unknownAuthor", "Unknown author"))}</span>
                    <span>${formatMoney(project.goalAmount)}</span>
                </div>
                <div class="project-progress">
                    <div class="project-progress-head">
                        <span>${formatMoney(project.collectedAmount)} ${appT("app.raised", "raised")}</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-value" style="width:${Math.min(percent, 100)}%"></div>
                    </div>
                </div>
                <div class="project-card-footer">
                    <strong>${escapeHtml(project.currency ?? "RUB")}</strong>
                    <div class="project-card-footer-actions">
                        <a class="ghost-btn" href="/project.html?id=${project.id}">${appT("app.openPage", "Open page")}</a>
                        <button class="ghost-btn" type="button" data-project-id="${project.id}">${appT("app.quickView", "Quick view")}</button>
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
    body.innerHTML = `<p class="panel-kicker">${appT("app.project", "Project")}</p><h3>${appT("app.loading", "Loading...")}</h3><p class="modal-copy">${appT("app.fetchingProject", "Fetching project details.")}</p>`;

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
        currentModalProject = project;
        currentModalReviews = reviews;
        renderProjectModal(project, reviews);
    } catch (error) {
        currentModalProject = null;
        currentModalReviews = [];
        body.innerHTML = `<p class="panel-kicker">${appT("app.project", "Project")}</p><h3>${appT("app.unavailable", "Unavailable")}</h3><p class="modal-copy">${appT("app.couldNotLoadCampaign", "Could not load this campaign.")}</p>`;
        console.error(error);
    }
}

function renderProjectModal(project, reviews) {
    const percent = getProgress(project.collectedAmount, project.goalAmount);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <p class="panel-kicker">${escapeHtml(project.categoryTitle ?? appT("app.project", "Project"))}</p>
        <h3>${escapeHtml(project.title)}</h3>
        <p class="modal-copy">${escapeHtml(project.description || project.shortDescription || "")}</p>
        <div class="modal-metrics">
            <div class="metric-box">
                <span>${appT("app.raisedCap", "Raised")}</span>
                <strong>${formatMoney(project.collectedAmount)}</strong>
            </div>
            <div class="metric-box">
                <span>${appT("app.goal", "Goal")}</span>
                <strong>${formatMoney(project.goalAmount)}</strong>
            </div>
            <div class="metric-box">
                <span>${appT("app.progress", "Progress")}</span>
                <strong>${percent}%</strong>
            </div>
            <div class="metric-box">
                <span>${appT("app.author", "Author")}</span>
                <strong>${escapeHtml(project.authorDisplayName ?? appT("app.unknown", "Unknown"))}</strong>
            </div>
        </div>
        <div class="project-progress">
            <div class="project-progress-head">
                <span>${appT("app.fundingStatus", "Funding status")}</span>
                <span>${percent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-value" style="width:${Math.min(percent, 100)}%"></div>
            </div>
        </div>
        <div class="project-card-footer project-modal-actions">
            <a class="primary-btn small-btn" href="/project.html?id=${project.id}">${appT("app.openFullPage", "Open full page")}</a>
        </div>
        <div class="review-list">
            ${reviews.length ? reviews.map((review) => `
                <article class="review-card">
                    <div class="review-head">
                        <strong>${escapeHtml(review.userDisplayName ?? appT("app.anonymous", "Anonymous"))}</strong>
                        <span class="review-rating">${"★".repeat(review.rating || 0)}</span>
                    </div>
                    <p>${escapeHtml(review.reviewText ?? "")}</p>
                </article>
            `).join("") : `<div class="empty-state">${appT("app.noReviewsForCampaign", "No reviews yet for this campaign.")}</div>`}
        </div>
    `;
}

function closeProjectModal() {
    const modal = document.getElementById("project-modal");
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    currentModalProject = null;
    currentModalReviews = [];
}

function renderError(error) {
    console.error(error);
    setText("total-raised", appT("app.unavailable", "Unavailable"));
    setText("active-projects", "-");
    setText("total-backers", "-");
    setText("funded-projects", "-");
}

function formatMoney(value) {
    return new Intl.NumberFormat(resolveAppLocale(), {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function formatCompactMoney(value) {
    return new Intl.NumberFormat(resolveAppLocale(), {
        style: "currency",
        currency: "RUB",
        notation: "compact",
        maximumFractionDigits: 1
    }).format(Number(value ?? 0));
}

function buildSmoothLinePath(coordinates) {
    if (!coordinates.length) {
        return "";
    }
    if (coordinates.length === 1) {
        return `M${coordinates[0].x},${coordinates[0].y}`;
    }

    let path = `M${coordinates[0].x},${coordinates[0].y}`;
    for (let index = 0; index < coordinates.length - 1; index += 1) {
        const current = coordinates[index];
        const next = coordinates[index + 1];
        const controlX = (current.x + next.x) / 2;
        path += ` C${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
    }
    return path;
}

function buildChartLabels(points) {
    const step = Math.max(1, Math.ceil(points.length / 8));
    return points.map((pointItem, index) => {
        const shouldShow = index === 0 || index === points.length - 1 || index % step === 0;
        return `<span>${shouldShow ? escapeHtml(pointItem.label) : ""}</span>`;
    }).join("");
}

function formatChartRangeBadge(label) {
    const lang = appI18n?.getLang?.() ?? "en";
    if (lang !== "ru") {
        return `${appT("index.chart.since", "Since")} ${label}`;
    }

    const months = {
        Jan: "января",
        Feb: "февраля",
        Mar: "марта",
        Apr: "апреля",
        May: "мая",
        Jun: "июня",
        Jul: "июля",
        Aug: "августа",
        Sep: "сентября",
        Oct: "октября",
        Nov: "ноября",
        Dec: "декабря"
    };

    const [monthToken, yearToken] = String(label ?? "").split(/\s+/, 2);
    const localizedMonth = months[monthToken] ?? monthToken ?? "";
    return yearToken
        ? `${appT("index.chart.since", "С")} ${localizedMonth} ${yearToken}`
        : `${appT("index.chart.since", "С")} ${localizedMonth}`;
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
        const sponsor = event.target.closest("[data-sponsor-index]");
        if (!sponsor) {
            return;
        }
        window.location.href = "/sponsors.html";
    });

    document.getElementById("modal-close").addEventListener("click", closeProjectModal);
    document.getElementById("modal-backdrop").addEventListener("click", closeProjectModal);

    const sectionMap = [
        {id: "overview-chart", menuHref: "/"}
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

function appT(key, fallback) {
    return appI18n?.t(key) ?? fallback;
}

function resolveAppLocale() {
    return appI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}

function positionChartCallout(callout, pointX, pointY, svgWidth, svgHeight) {
    const chartNode = callout.parentElement;
    const chartWidth = chartNode.clientWidth || svgWidth;
    const chartHeight = chartNode.clientHeight || svgHeight;
    const scaledX = (pointX / svgWidth) * chartWidth;
    const scaledY = (pointY / svgHeight) * chartHeight;
    const halfWidth = (callout.offsetWidth || 0) / 2;
    const horizontalPadding = 12;
    const topPadding = 20;
    const clampedX = Math.min(Math.max(scaledX, halfWidth + horizontalPadding), chartWidth - halfWidth - horizontalPadding);
    const clampedY = Math.max(scaledY, topPadding);

    callout.style.left = `${clampedX}px`;
    callout.style.top = `${clampedY}px`;
}
