const analyticsI18n = window.AppI18n;
const analyticsT = (key) => analyticsI18n.t(key);
const escapeAnalyticsHtml = window.RiseUpProjects.escapeHtml;
const analyticsProjectDetails = new Map();
let analyticsData = null, analyticsCategories = [], analyticsFailed = false, analyticsLeaderboardFilter = "all";
const analyticsLocale = () => analyticsI18n.getLang() === "ru" ? "ru-RU" : "en-US";
const analyticsMoney = (value, currency = "RUB", compact = false) => window.RiseUpProjects.formatMoney(value, currency, compact);

bootstrapAnalyticsPage();
document.addEventListener("app:lang-changed", renderAnalytics);
window.addEventListener("resize", () => { if (analyticsData) renderAnalyticsChart(analyticsData.monthlyRaised ?? []); });
const analyticsPeriodButtons = [...document.querySelectorAll("[data-filter]")];
analyticsPeriodButtons.forEach((button, index) => {
    button.addEventListener("click", () => { analyticsLeaderboardFilter = button.dataset.filter; renderAnalyticsTopProjects(); });
    button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
        analyticsPeriodButtons[next].click(); analyticsPeriodButtons[next].focus();
    });
});
async function analyticsFetch(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("analytics.loadError");
    return response.json();
}
async function bootstrapAnalyticsPage() {
    const [dashboard, categories] = await Promise.allSettled([analyticsFetch("/api/dashboard"), analyticsFetch("/api/categories")]);
    if (categories.status === "fulfilled") analyticsCategories = categories.value;
    if (dashboard.status === "fulfilled") analyticsData = dashboard.value;
    else analyticsFailed = true;
    renderAnalytics();
    if (!analyticsData) return;
    const ids = [...new Set([...(analyticsData.topProjects ?? []), ...(analyticsData.topProjectsYear ?? []), ...(analyticsData.topProjectsMonth ?? [])].map((project) => project.id).filter(Boolean))];
    await Promise.allSettled(ids.map(async (id) => { analyticsProjectDetails.set(String(id), await analyticsFetch(`/api/projects/${encodeURIComponent(id)}`)); }));
    renderAnalyticsTopProjects();
}
function renderAnalytics() {
    const data = analyticsData;
    document.getElementById("analytics-metrics").setAttribute("aria-busy", String(!data && !analyticsFailed));
    const status = document.getElementById("analytics-status");
    status.hidden = !analyticsFailed;
    status.textContent = analyticsFailed ? analyticsT("analytics.loadError") : "";
    status.setAttribute("role", analyticsFailed ? "alert" : "status");
    if (data) {
        document.getElementById("analytics-total-raised").textContent = analyticsMoney(data.totalRaised, "RUB", true);
        document.getElementById("analytics-active-projects").textContent = data.activeProjects ?? 0;
        document.getElementById("analytics-funded-projects").textContent = data.fundedProjects ?? 0;
        document.getElementById("analytics-total-backers").textContent = data.totalBackers ?? 0;
    }
    document.getElementById("analytics-active-label").textContent = analyticsI18n.plural("count.activeProject", data?.activeProjects ?? 0);
    document.getElementById("analytics-funded-label").textContent = analyticsI18n.plural("analytics.funded", data?.fundedProjects ?? 0);
    document.getElementById("analytics-backers-label").textContent = analyticsI18n.plural("analytics.backers", data?.totalBackers ?? 0);
    renderAnalyticsChart(data?.monthlyRaised ?? []);
    renderAnalyticsTopProjects();
    renderAnalyticsPeople();
}
function renderAnalyticsTopProjects() {
    analyticsPeriodButtons.forEach((button) => { const on = button.dataset.filter === analyticsLeaderboardFilter; button.setAttribute("aria-selected", String(on)); button.tabIndex = on ? 0 : -1; });
    const root = document.getElementById("analytics-top-projects");
    root.setAttribute("aria-labelledby", `analytics-period-${analyticsLeaderboardFilter}`);
    root.setAttribute("aria-busy", String(!analyticsData && !analyticsFailed));
    const key = {all: "topProjects", year: "topProjectsYear", month: "topProjectsMonth"}[analyticsLeaderboardFilter];
    const items = analyticsData?.[key] ?? [];
    root.innerHTML = items.length ? items.map((row, index) => {
        const detail = analyticsProjectDetails.get(String(row.id));
        const title = detail ? window.RiseUpProjects.categoryTitle(detail, analyticsCategories) : row.categoryTitle || analyticsT("category.unknown");
        const color = detail ? window.RiseUpProjects.categoryColor(detail, analyticsCategories) : "#3A3A40";
        const raw = Number(row.progressPercent ?? (Number(row.goalAmount) > 0 ? Number(row.collectedAmount || 0) / Number(row.goalAmount) * 100 : 0));
        const progress = raw < 100 || detail?.status === "ACTIVE" ? Math.min(99, Math.max(0, Math.floor(raw))) : Math.max(0, Math.round(raw));
        return `<li><a class="analytics-ranking-row" href="/project.html?id=${encodeURIComponent(row.id)}"><span class="analytics-rank">${index + 1}</span><span class="analytics-rank-cover" style="--category-color:${color}" aria-hidden="true">${detail?.hasCoverImage ? `<img src="/api/projects/${encodeURIComponent(row.id)}/image" alt="" loading="lazy">` : ""}</span><span class="analytics-rank-copy"><b>${escapeAnalyticsHtml(row.title)}</b><span>${escapeAnalyticsHtml(row.authorDisplayName || analyticsT("app.unknown"))} · ${escapeAnalyticsHtml(title)}</span></span><span class="analytics-rank-funding"><span><b>${escapeAnalyticsHtml(analyticsMoney(row.collectedAmount, row.currency))}</b><span>${progress}%</span></span><progress class="progress" value="${Math.min(100, progress)}" max="100" aria-label="${escapeAnalyticsHtml(analyticsT("public.progress"))}"></progress></span></a></li>`;
    }).join("") : `<li class="empty-state">${escapeAnalyticsHtml(analyticsT(analyticsFailed ? "app.unavailable" : !analyticsData ? "app.loading" : "app.noCampaigns"))}</li>`;
    document.getElementById("analytics-period-note").textContent = analyticsT(`analytics.note.${analyticsLeaderboardFilter}`);
}
function localizeAnalyticsLabel(value) {
    const raw = String(value ?? "");
    const match = raw.match(/^(?:(\d{1,2})\s+)?([A-Za-z]+)(?:\s+(\d{4}))?$/);
    if (!match) return raw;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(match[2].slice(0, 3).toLowerCase());
    if (month < 0) return raw;
    const label = new Intl.DateTimeFormat(analyticsLocale(), {month: "short", ...(match[1] ? {day: "numeric"} : {})}).format(new Date(2000, month, Number(match[1] || 1)));
    return match[3] ? `${label} ${match[3]}` : label;
}
function renderAnalyticsChart(points) {
    const plot = document.getElementById("analytics-chart-plot");
    plot.hidden = !points.length;
    document.getElementById("analytics-chart-empty").hidden = Boolean(points.length);
    const line = document.getElementById("chart-line-path"), area = document.getElementById("chart-area-path");
    if (!points.length) { line.setAttribute("d", ""); area.setAttribute("d", ""); return; }
    const values = points.map((point) => Math.max(0, Number(point.amount) || 0));
    const rawMax = Math.max(...values, 1), unit = 10 ** Math.floor(Math.log10(rawMax));
    const max = Math.ceil(rawMax * 1.05 / unit) * unit;
    const coordinates = values.map((value, index) => ({x: values.length === 1 ? 500 : 8 + index / (values.length - 1) * 984, y: 264 - value / max * 256}));
    const path = coordinates.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    line.setAttribute("d", path);
    area.setAttribute("d", `${path} L${coordinates.at(-1).x},264 L${coordinates[0].x},264 Z`);
    const last = coordinates.at(-1), circle = document.getElementById("analytics-chart-point");
    circle.setAttribute("cx", last.x); circle.setAttribute("cy", last.y);
    document.getElementById("analytics-chart-axis").innerHTML = [max, max * 2 / 3, max / 3, 0].map((value) => `<span>${escapeAnalyticsHtml(analyticsMoney(value, "RUB", true))}</span>`).join("");
    const count = Math.min(points.length, innerWidth < 600 ? 4 : 10);
    const indices = [...new Set(Array.from({length: count}, (_, index) => count === 1 ? 0 : Math.round(index * (points.length - 1) / (count - 1))))];
    const labels = document.getElementById("chart-months");
    labels.replaceChildren(...indices.map((index) => { const node = document.createElement("span"); node.textContent = localizeAnalyticsLabel(points[index].label); return node; }));
    labels.style.gridTemplateColumns = `repeat(${indices.length}, minmax(0, 1fr))`;
    document.getElementById("analytics-chart-description").textContent = analyticsT("analytics.chartSummary").replace("{first}", localizeAnalyticsLabel(points[0].label)).replace("{last}", localizeAnalyticsLabel(points.at(-1).label)).replace("{startAmount}", analyticsMoney(values[0])).replace("{endAmount}", analyticsMoney(values.at(-1)));
}
function renderAnalyticsPeople() {
    const authors = new Map(), sponsors = analyticsData?.recentSponsors ?? [];
    for (const item of analyticsData?.recentFounders ?? []) {
        const id = item.authorId ?? item.id;
        const name = item.authorDisplayName ?? item.displayName ?? "";
        const key = id == null ? `name:${name}` : `id:${id}`;
        const author = authors.get(key) || {id, name, count: 0, hasAvatar: false};
        author.count += 1;
        author.hasAvatar ||= Boolean(item.hasAvatar);
        authors.set(key, author);
    }
    const founders = [...authors.values()];
    const avatar = (id, name, hasAvatar, group) => `<span class="analytics-person-avatar" style="--profile-color:${window.RiseUpUI.resolveProfileColor(id)}" aria-hidden="true">${hasAvatar ? `<img src="/api/showcase/${group}/${encodeURIComponent(id)}/avatar" alt="" loading="lazy">` : ""}<span>${escapeAnalyticsHtml(String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase())}</span></span>`;
    document.getElementById("analytics-founders").innerHTML = founders.length ? founders.map((item) => `<li>${avatar(item.id ?? item.name, item.name, item.id != null && item.hasAvatar, "founders")}<div><b>${escapeAnalyticsHtml(item.name || analyticsT("app.unknown"))}</b><span>${escapeAnalyticsHtml(`${new Intl.NumberFormat(analyticsLocale()).format(item.count)} ${analyticsI18n.plural("count.project", item.count)}`)}</span></div></li>`).join("") : `<li class="empty-state">${escapeAnalyticsHtml(analyticsT(analyticsFailed ? "app.unavailable" : "analytics.noAuthors"))}</li>`;
    document.getElementById("analytics-sponsors").innerHTML = sponsors.length ? sponsors.map((item) => `<li>${avatar(item.sponsorId, item.sponsorDisplayName || "", item.hasAvatar, "sponsors")}<div><b>${escapeAnalyticsHtml(item.sponsorDisplayName || analyticsT("app.unknown"))}</b><span>${escapeAnalyticsHtml(analyticsT("analytics.supportedOn").replace("{date}", window.RiseUpModeration.date(item.supportedAt)))}</span></div></li>`).join("") : `<li class="empty-state">${escapeAnalyticsHtml(analyticsT(analyticsFailed ? "app.unavailable" : "analytics.noSponsors"))}</li>`;
    document.querySelectorAll(".analytics-person-avatar img").forEach((image) => image.addEventListener("error", () => image.remove(), {once: true}));
}
