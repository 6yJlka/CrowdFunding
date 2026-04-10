const moderationReviewQuery = new URLSearchParams(window.location.search);
const moderationProjectId = moderationReviewQuery.get("id");
const moderationAuth = readModerationAuth();
const moderationI18n = window.AppI18n;
const moderationState = {
    project: null,
    stats: null,
    updates: [],
    comments: []
};

if (!moderationAuth?.accessToken) {
    window.location.href = "/auth.html";
}

document.addEventListener("app:lang-changed", () => {
    renderModerationView();
});

bootstrapModerationReview().catch((error) => {
    setModerationStatus(error.message, "error");
    document.getElementById("moderation-project-category").textContent = moderationT("shell.moderation", "Moderation");
    document.getElementById("moderation-project-title").textContent = moderationT("app.unavailable", "Unavailable");
});

async function bootstrapModerationReview() {
    if (!moderationProjectId) {
        throw new Error(moderationT("project.error.missingId", "Project id is missing"));
    }

    const me = await fetch("/api/auth/me", {
        headers: {
            "Authorization": `${moderationAuth.tokenType || "Bearer"} ${moderationAuth.accessToken}`
        }
    });
    const user = me.ok ? await me.json() : null;
    const roles = Array.isArray(user?.roles) ? user.roles.map((role) => String(role).replace("ROLE_", "")) : [];
    if (!roles.includes("ADMIN")) {
        window.location.href = "/";
        return;
    }

    wireModerationActions();
    await loadModerationProject();
}

async function loadModerationProject() {
    const [projectResponse, statsResponse, updatesResponse, commentsResponse] = await Promise.all([
        fetch(`/api/projects/${moderationProjectId}`),
        fetch(`/api/projects/${moderationProjectId}/statistics`),
        fetch(`/api/projects/${moderationProjectId}/updates`),
        fetch(`/api/projects/${moderationProjectId}/comments`)
    ]);

    if (!projectResponse.ok) {
        throw new Error(moderationT("project.error.notFound", "Project not found"));
    }

    moderationState.project = await projectResponse.json();
    moderationState.stats = statsResponse.ok ? await statsResponse.json() : null;
    moderationState.updates = updatesResponse.ok ? await updatesResponse.json() : [];
    moderationState.comments = commentsResponse.ok ? await commentsResponse.json() : [];

    renderModerationView();
}

function renderModerationView() {
    const {project, stats, updates, comments} = moderationState;
    if (!project) {
        return;
    }

    document.getElementById("moderation-project-category").textContent = project.categoryTitle || moderationT("shell.moderation", "Moderation");
    document.getElementById("moderation-project-title").textContent = project.title || moderationT("app.project", "Project");
    document.getElementById("moderation-short-description").textContent = project.shortDescription || moderationT("app.noData", "No data");
    document.getElementById("moderation-description").textContent = project.description || moderationT("app.noData", "No data");
    document.getElementById("moderation-public-link").href = `/project.html?id=${project.id}`;
    document.getElementById("moderation-status-label").textContent = localizeModerationStatus(project.status);

    const reasonBlock = document.getElementById("moderation-reason-block");
    const reasonText = document.getElementById("moderation-reason-text");
    if (project.rejectionReason) {
        reasonBlock.classList.remove("hidden");
        reasonText.textContent = project.rejectionReason;
    } else {
        reasonBlock.classList.add("hidden");
        reasonText.textContent = "";
    }

    renderModerationSummary(project, stats);
    renderModerationUpdates(updates);
    renderModerationComments(comments);
}

function renderModerationSummary(project, stats) {
    const progress = resolveModerationProgress(project, stats);
    const currency = project.currency || "USD";

    document.getElementById("moderation-summary-grid").innerHTML = `
        <div class="metric-box">
            <span>${moderationT("app.author", "Author")}</span>
            <strong>${escapeModerationHtml(project.authorDisplayName ?? moderationT("app.unknown", "Unknown"))}</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("app.goal", "Goal")}</span>
            <strong>${formatModerationMoney(stats?.goalAmount ?? project.goalAmount, currency)}</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("app.raisedCap", "Raised")}</span>
            <strong>${formatModerationMoney(stats?.totalAmount ?? project.collectedAmount, currency)}</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("project.donors", "Donors")}</span>
            <strong>${stats?.totalDonors ?? 0}</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("app.progress", "Progress")}</span>
            <strong>${progress}%</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("moderation.createdAt", "Created")}</span>
            <strong>${formatModerationDate(project.createdAt)}</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("moderation.startAt", "Start")}</span>
            <strong>${formatModerationDate(project.startAt)}</strong>
        </div>
        <div class="metric-box">
            <span>${moderationT("moderation.endAt", "End")}</span>
            <strong>${formatModerationDate(project.endAt)}</strong>
        </div>
    `;
}

function renderModerationUpdates(updates) {
    const node = document.getElementById("moderation-updates");
    node.innerHTML = updates.length
        ? updates.map((update) => `
            <article class="timeline-card">
                <div class="timeline-meta">
                    <strong>${escapeModerationHtml(update.title ?? moderationT("project.update.titleDefault", "Update"))}</strong>
                    <span>${formatModerationDate(update.createdAt)}</span>
                </div>
                <p class="timeline-author">${escapeModerationHtml(update.authorDisplayName ?? moderationT("app.author", "Author"))}</p>
                <p>${escapeModerationHtml(update.content ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">${moderationT("project.update.none", "No updates published yet.")}</div>`;
}

function renderModerationComments(comments) {
    const node = document.getElementById("moderation-comments");
    node.innerHTML = comments.length
        ? comments.map((comment) => `
            <article class="review-card comment-card${comment.deleted ? " comment-card-deleted" : ""}">
                <div class="review-head">
                    <strong>${escapeModerationHtml(comment.userDisplayName ?? moderationT("app.anonymous", "Anonymous"))}</strong>
                    <span>${formatModerationDate(comment.createdAt)}</span>
                </div>
                <p>${escapeModerationHtml(comment.content ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">${moderationT("project.comment.none", "No comments yet.")}</div>`;
}

function wireModerationActions() {
    document.getElementById("moderation-approve-btn").addEventListener("click", async () => {
        const response = await fetch(`/api/admin/projects/${moderationProjectId}/approve`, {
            method: "POST",
            headers: buildModerationHeaders(true)
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            setModerationStatus(body.message || body.error || moderationT("admin.action.error", "Could not process project action"), "error");
            return;
        }

        setModerationStatus(moderationT("admin.action.approved", "Project approved"), "success");
        await loadModerationProject();
    });

    document.getElementById("moderation-reject-btn").addEventListener("click", async () => {
        const reason = document.getElementById("moderation-reject-reason").value.trim();
        if (!reason) {
            setModerationStatus(moderationT("admin.reject.required", "Reject reason is required"), "error");
            return;
        }

        const response = await fetch(`/api/admin/projects/${moderationProjectId}/reject`, {
            method: "POST",
            headers: buildModerationHeaders(true),
            body: JSON.stringify({reason})
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            setModerationStatus(body.message || body.error || moderationT("admin.action.error", "Could not process project action"), "error");
            return;
        }

        setModerationStatus(moderationT("admin.action.rejected", "Project rejected"), "success");
        await loadModerationProject();
    });
}

function buildModerationHeaders(includeJson) {
    return {
        "Authorization": `${moderationAuth.tokenType || "Bearer"} ${moderationAuth.accessToken}`,
        ...(includeJson ? {"Content-Type": "application/json"} : {})
    };
}

function resolveModerationProgress(project, stats) {
    const progress = Number(stats?.progress);
    if (Number.isFinite(progress)) {
        return Math.max(0, Math.round(progress));
    }
    const raised = Number(stats?.totalAmount ?? project?.collectedAmount ?? 0);
    const goal = Number(stats?.goalAmount ?? project?.goalAmount ?? 0);
    if (!goal) {
        return 0;
    }
    return Math.max(0, Math.round((raised / goal) * 100));
}

function formatModerationMoney(value, currency) {
    return new Intl.NumberFormat(resolveModerationLocale(), {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function formatModerationDate(value) {
    if (!value) {
        return moderationT("app.noData", "No data");
    }
    return new Intl.DateTimeFormat(resolveModerationLocale(), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function resolveModerationLocale() {
    return moderationI18n?.getLang() === "ru" ? "ru-RU" : "en-US";
}

function localizeModerationStatus(status) {
    const normalized = String(status || "MODERATION").toUpperCase();
    return moderationT(`project.status.${normalized}`, normalized);
}

function setModerationStatus(message, type = "") {
    const node = document.getElementById("moderation-page-status");
    node.textContent = message;
    node.className = `auth-status ${type}`.trim();
}

function readModerationAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function escapeModerationHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function moderationT(key, fallback) {
    return moderationI18n?.t(key) ?? fallback;
}
