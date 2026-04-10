const analyticsI18n = window.AppI18n;

bootstrapAnalyticsPage().catch((error) => console.error(error));

async function bootstrapAnalyticsPage() {
    const response = await fetch("/api/dashboard");
    if (!response.ok) {
        throw new Error("Dashboard request failed");
    }

    const data = await response.json();
    renderAnalytics(data);
}

function renderAnalytics(data) {
    document.getElementById("analytics-total-raised").textContent = formatAnalyticsMoney(data.totalRaised);
    document.getElementById("analytics-active-projects").textContent = `${data.activeProjects ?? 0}`;
    document.getElementById("analytics-total-backers").textContent = `${data.totalBackers ?? 0}`;
    document.getElementById("analytics-funded-projects").textContent = `${data.fundedProjects ?? 0}`;
    renderAnalyticsTopProjects(data.topProjects ?? []);
    renderAnalyticsChart(data.monthlyRaised ?? []);
}

function renderAnalyticsTopProjects(items) {
    const body = document.getElementById("analytics-top-projects");
    body.innerHTML = items.length
        ? items.map((project, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <a href="/project.html?id=${project.id}">${escapeAnalyticsHtml(project.title)}</a>
                    <div class="table-subtitle">${escapeAnalyticsHtml(project.categoryTitle ?? analyticsT("app.general", "General"))} · ${formatAnalyticsCompactMoney(project.collectedAmount)}</div>
                </td>
                <td>${escapeAnalyticsHtml(project.authorDisplayName ?? analyticsT("app.unknown", "Unknown"))}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">${analyticsT("app.noCampaigns", "No campaigns available")}</td></tr>`;
}

function renderAnalyticsChart(points) {
    const labelsContainer = document.getElementById("chart-months");
    const linePath = document.getElementById("chart-line-path");
    const areaPath = document.getElementById("chart-area-path");
    const point = document.getElementById("chart-point");
    const callout = document.getElementById("chart-callout");
    const rangeBadge = document.getElementById("chart-range-badge");

    if (!points.length) {
        labelsContainer.innerHTML = `<span>${analyticsT("app.noData", "No data")}</span>`;
        labelsContainer.style.gridTemplateColumns = "1fr";
        rangeBadge.textContent = analyticsT("index.chart.emptyRange", "No data yet");
        updateAnalyticsAxis(0, 0);
        point.setAttribute("cx", "0");
        point.setAttribute("cy", "0");
        linePath.setAttribute("d", "");
        areaPath.setAttribute("d", "");
        callout.textContent = "$0";
        callout.style.left = "50%";
        callout.style.top = "40%";
        return;
    }

    labelsContainer.style.gridTemplateColumns = `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`;
    labelsContainer.innerHTML = buildAnalyticsChartLabels(points);
    rangeBadge.textContent = `${analyticsT("index.chart.since", "Since")} ${points[0].label}`;

    const values = points.map((pointItem) => Number(pointItem.amount ?? 0));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values, 1);
    const visualPadding = Math.max((maxValue - minValue) * 0.18, maxValue * 0.08, 1);
    const displayMin = Math.max(0, minValue - visualPadding);
    const displayMax = maxValue + visualPadding;
    updateAnalyticsAxis(displayMin, displayMax);

    const width = 800;
    const leftPadding = 12;
    const rightPadding = 12;
    const topY = 18;
    const bottomY = 294;
    const drawableHeight = bottomY - topY;
    const stepX = points.length > 1 ? (width - leftPadding - rightPadding) / (points.length - 1) : 0;
    const coordinates = values.map((value, index) => {
        const ratio = displayMax === displayMin ? 0.5 : (value - displayMin) / (displayMax - displayMin);
        return {
            x: leftPadding + stepX * index,
            y: bottomY - Math.max(0, Math.min(1, ratio)) * drawableHeight
        };
    });

    const path = buildAnalyticsSmoothLinePath(coordinates);
    linePath.setAttribute("d", path);
    areaPath.setAttribute("d", `${path} L${coordinates[coordinates.length - 1].x},${bottomY} L${coordinates[0].x},${bottomY} Z`);

    const lastPoint = coordinates[coordinates.length - 1];
    point.setAttribute("cx", `${lastPoint.x}`);
    point.setAttribute("cy", `${lastPoint.y}`);
    callout.textContent = formatAnalyticsCompactMoney(values[values.length - 1]);
    callout.style.left = `${(lastPoint.x / width) * 100}%`;
    callout.style.top = `${(lastPoint.y / 320) * 100}%`;
}

function updateAnalyticsAxis(minValue, maxValue) {
    const range = Math.max(maxValue - minValue, 1);
    document.getElementById("axis-max").textContent = formatAnalyticsCompactMoney(maxValue);
    document.getElementById("axis-75").textContent = formatAnalyticsCompactMoney(minValue + range * 0.75);
    document.getElementById("axis-50").textContent = formatAnalyticsCompactMoney(minValue + range * 0.5);
    document.getElementById("axis-25").textContent = formatAnalyticsCompactMoney(minValue + range * 0.25);
    document.getElementById("axis-min").textContent = formatAnalyticsCompactMoney(minValue);
}

function buildAnalyticsSmoothLinePath(coordinates) {
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

function buildAnalyticsChartLabels(points) {
    const step = Math.max(1, Math.ceil(points.length / 8));
    return points.map((pointItem, index) => {
        const shouldShow = index === 0 || index === points.length - 1 || index % step === 0;
        return `<span>${shouldShow ? escapeAnalyticsHtml(pointItem.label) : ""}</span>`;
    }).join("");
}

function formatAnalyticsMoney(value) {
    return new Intl.NumberFormat("en-US", {style: "currency", currency: "USD", maximumFractionDigits: 0}).format(Number(value ?? 0));
}

function formatAnalyticsCompactMoney(value) {
    const formatter = new Intl.NumberFormat("en-US", {notation: "compact", maximumFractionDigits: 1});
    return `$${formatter.format(Number(value ?? 0))}`;
}

function escapeAnalyticsHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function analyticsT(key, fallback) {
    return analyticsI18n?.t(key) ?? fallback;
}
