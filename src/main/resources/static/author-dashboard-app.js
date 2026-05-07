const authorAuth = readStoredAuth();
const authorProjectsNode = document.getElementById("author-projects");
const authorStatusNode = document.getElementById("author-status");
const authorStatsNode = document.getElementById("author-stats");
const authorActivitiesNode = document.getElementById("author-activities");
const authorNameNode = document.getElementById("author-name");
const authorBioNode = document.getElementById("author-bio");
const authorEmailNode = document.getElementById("author-email");
const authorRegistrationDateNode = document.getElementById("author-registration-date");
const authorBioEditButtonNode = document.getElementById("author-bio-edit-btn");
const authorBioFormNode = document.getElementById("author-bio-form");
const authorBioInputNode = document.getElementById("author-bio-input");
const authorBioCounterNode = document.getElementById("author-bio-counter");
const authorBioCancelButtonNode = document.getElementById("author-bio-cancel-btn");
const authorBioSaveButtonNode = document.getElementById("author-bio-save-btn");
const authorProfileKickerNode = document.getElementById("author-profile-kicker");
const authorRegistrationLabelNode = document.getElementById("author-registration-label");
const authorEmailLabelNode = document.getElementById("author-email-label");
const authorHomeLinkNode = document.getElementById("author-home-link");
const authorNewProjectLinkNode = document.getElementById("author-new-project-link");
const authorActivityKickerNode = document.getElementById("author-activity-kicker");
const authorActivityTitleNode = document.getElementById("author-activity-title");
const authorGuideKickerNode = document.getElementById("author-guide-kicker");
const authorGuideTitleNode = document.getElementById("author-guide-title");
const authorGuideListNode = document.getElementById("author-guide-list");
const authorProjectsKickerNode = document.getElementById("author-projects-kicker");
const authorProjectsTitleNode = document.getElementById("author-projects-title");
const authorAvatarInputNode = document.getElementById("author-avatar-input");
const authorAvatarPreviewNode = document.getElementById("author-avatar-preview");
const authorAvatarFallbackNode = document.getElementById("author-avatar-fallback");
const authorAvatarUploadLabelNode = document.getElementById("author-avatar-upload-label");
let currentAvatarObjectUrl = "";
let currentProfileHasAvatar = false;
let currentAuthorProfile = null;
let currentAuthorProjects = [];

if (!authorAuth?.accessToken) {
    window.location.href = "/auth.html";
}

initializeAuthorDashboard().catch((error) => setAuthorStatus(error.message, "error"));

authorAvatarInputNode?.addEventListener("change", handleAvatarChange);
authorBioEditButtonNode?.addEventListener("click", openBioEditor);
authorBioCancelButtonNode?.addEventListener("click", closeBioEditor);
authorBioInputNode?.addEventListener("input", syncBioCounter);
authorBioFormNode?.addEventListener("submit", saveBio);
document.addEventListener("app:lang-changed", () => {
    applyAuthorStaticTranslations();
    if (currentAuthorProfile) {
        renderAuthorProfile(currentAuthorProfile);
        void loadAuthorAvatar(currentProfileHasAvatar);
    }
    renderDashboardStats(currentAuthorProjects);
    renderRecentActivities(currentAuthorProjects);
    renderAuthorProjects(currentAuthorProjects);
});

async function initializeAuthorDashboard() {
    applyAuthorStaticTranslations();
    setAuthorStatus(t("author.status.loadingProfile", "Loading profile..."), "info");

    const [profile, projects] = await Promise.all([
        loadAuthorProfile(),
        loadAuthorProjects()
    ]);

    currentAuthorProfile = profile;
    currentAuthorProjects = projects;
    renderAuthorProfile(profile);
    await loadAuthorAvatar(profile.hasAvatar);
    renderDashboardStats(projects);
    renderRecentActivities(projects);
    renderAuthorProjects(projects);
    setAuthorStatus("", "");
}

async function loadAuthorProfile() {
    const response = await fetch("/api/auth/me", {
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(t("author.status.profileError", "Could not load author profile"));
    }

    return response.json();
}

async function loadAuthorProjects() {
    const response = await fetch("/api/me/projects?size=24", {
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(t("author.status.projectsError", "Could not load author projects"));
    }

    const payload = await response.json();
    return payload.content ?? [];
}

function renderAuthorProfile(profile) {
    const displayName = profile.displayName || (profile.email || "author").split("@")[0];
    currentProfileHasAvatar = Boolean(profile.hasAvatar);

    document.title = t("author.title", "Author Dashboard | RiseUp");
    authorNameNode.textContent = displayName;
    authorBioNode.textContent = profile.bio || t("author.bio", "Lead developer, building open-source projects.");
    authorBioInputNode.value = profile.bio || "";
    syncBioCounter();
    authorEmailNode.textContent = profile.email || "-";
    authorRegistrationDateNode.textContent = formatAuthorDate(profile.createdAt);
    authorAvatarFallbackNode.textContent = getInitials(displayName);

    showAvatarFallback(displayName);
}

function openBioEditor() {
    authorBioFormNode.classList.remove("hidden");
    authorBioEditButtonNode.classList.add("hidden");
    authorBioInputNode.value = currentAuthorProfile?.bio || "";
    syncBioCounter();
    authorBioInputNode.focus();
    authorBioInputNode.setSelectionRange(authorBioInputNode.value.length, authorBioInputNode.value.length);
}

function closeBioEditor() {
    authorBioFormNode.classList.add("hidden");
    authorBioEditButtonNode.classList.remove("hidden");
    authorBioInputNode.value = currentAuthorProfile?.bio || "";
    syncBioCounter();
}

function syncBioCounter() {
    authorBioCounterNode.textContent = `${authorBioInputNode.value.length} / 280`;
}

async function saveBio(event) {
    event.preventDefault();

    const bio = authorBioInputNode.value.trim();
    if (!bio) {
        setAuthorStatus(t("author.status.bioRequired", "Please fill in your profile description"), "error");
        return;
    }

    setAuthorStatus(t("author.status.bioSaving", "Saving description..."), "info");

    const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({bio})
    });

    if (!response.ok) {
        setAuthorStatus(t("author.status.bioSaveError", "Could not save description"), "error");
        return;
    }

    currentAuthorProfile = await response.json();
    renderAuthorProfile(currentAuthorProfile);
    await loadAuthorAvatar(currentProfileHasAvatar);
    closeBioEditor();
    setAuthorStatus(t("author.status.bioSaved", "Description saved"), "success");
}

function renderDashboardStats(projects) {
    const totalProjects = projects.length;
    const successfulProjects = projects.filter(isSuccessfulProject).length;
    const successRate = totalProjects ? Math.round((successfulProjects / totalProjects) * 100) : 0;
    const totalCollected = projects.reduce((sum, project) => sum + normalizeNumber(project.collectedAmount), 0);
    const currency = resolveCurrency(projects);

    const stats = [
        { title: t("author.stats.totalProjects", "Total projects"), value: String(totalProjects), icon: "◥", accentClass: "accent-violet" },
        { title: t("author.stats.successfulProjects", "Successful campaigns"), value: String(successfulProjects), icon: "↗", accentClass: "accent-green" },
        { title: t("author.stats.successRate", "Success rate"), value: `${successRate}%`, icon: "%", accentClass: "accent-cyan" },
        { title: t("author.stats.totalRaised", "Total raised"), value: formatMoney(totalCollected, currency), icon: resolveCurrencyIcon(currency), accentClass: "accent-orange" }
    ];

    authorStatsNode.innerHTML = stats.map((stat) => `
        <article class="stat-card ${stat.accentClass}">
            <div class="stat-head">
                <span class="stat-link stat-link-static">${escapeHtml(stat.title)}</span>
                <span class="stat-icon stat-icon-soft">${escapeHtml(stat.icon)}</span>
            </div>
            <div class="stat-copy">
                <h2>${escapeHtml(stat.value)}</h2>
                <p>${escapeHtml(stat.title)}</p>
            </div>
            <div class="mini-bars mini-bars-soft">
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
            </div>
        </article>
    `).join("");
}

function renderRecentActivities(projects) {
    const activities = projects
        .slice()
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
        .slice(0, 3)
        .map((project) => {
            const dateLabel = formatAuthorDate(project.updatedAt || project.createdAt);
            const verb = project.updatedAt && project.updatedAt !== project.createdAt
                ? formatActivityVerb(t("author.activity.updated", "updated"))
                : t("author.activity.created", "created");
            return `
                <li class="author-activity-item">
                    <div class="author-activity-dot"></div>
                    <div>
                        <strong>${escapeHtml(project.title || t("author.project.untitled", "Untitled"))}</strong>
                        <p>${escapeHtml(formatActivityDescription(verb, project.status))}</p>
                        <span>${escapeHtml(dateLabel)}</span>
                    </div>
                </li>
            `;
        });

    authorActivitiesNode.innerHTML = activities.length
        ? activities.join("")
        : `<li class="empty-state">${escapeHtml(t("author.activity.empty", "No activity yet. Create your first project to bring this dashboard to life."))}</li>`;
}

function renderAuthorProjects(projects) {
    if (!projects.length) {
        authorProjectsNode.innerHTML = `<div class="empty-state">${escapeHtml(t("author.projects.empty", "You do not have any projects yet."))}</div>`;
        return;
    }

    authorProjectsNode.innerHTML = projects.map((project) => {
        const canSubmit = project.status === "DRAFT" || project.status === "REJECTED";
        const progress = resolveAuthorProjectProgress(project);
        return `
            <article class="project-card author-project-card">
                <div class="project-card-media author-project-card-media">
                    ${renderAuthorProjectCover(project)}
                </div>
                <div class="project-card-content author-project-card-content">
                    <div class="author-project-card-topline">
                        <div class="author-project-card-copy">
                            <h4>${escapeHtml(project.title || t("author.project.untitled", "Untitled"))}</h4>
                            <p>${escapeHtml(project.shortDescription ?? "")}</p>
                        </div>
                        <div class="author-project-card-goal">
                            <span>${escapeHtml(t("author.project.goal", "Goal"))}</span>
                            <strong>${escapeHtml(formatMoney(project.goalAmount, project.currency))}</strong>
                        </div>
                    </div>
                    <div class="project-progress author-project-progress">
                        <div class="project-progress-head">
                            <span>${escapeHtml(t("author.project.raised", "Raised"))}: ${escapeHtml(formatMoney(project.collectedAmount, project.currency))}</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-value" style="width:${Math.min(progress, 100)}%"></div>
                        </div>
                    </div>
                    <div class="author-project-card-meta">
                        <span>${escapeHtml(t("author.project.updated", "Updated"))}: ${escapeHtml(formatAuthorDate(project.updatedAt || project.createdAt))}</span>
                        <span>${escapeHtml(t("author.project.currency", "Currency"))}: ${escapeHtml(project.currency ?? "RUB")}</span>
                    </div>
                    <div class="project-card-header author-project-card-badges">
                        <span class="status-badge">${escapeHtml(formatProjectStatus(project.status))}</span>
                        <span class="meta-pill">${escapeHtml(project.categoryTitle ?? t("app.general", "General"))}</span>
                    </div>
                    ${project.rejectionReason ? `<div class="project-rejection-note"><strong>${escapeHtml(t("author.project.moderationNote", "Moderation note"))}:</strong> ${escapeHtml(project.rejectionReason)}</div>` : ""}
                    <div class="project-card-footer author-project-card-footer">
                        <div class="project-card-footer-actions">
                            <a class="ghost-btn" href="/project.html?id=${project.id}">${escapeHtml(t("author.project.open", "Open"))}</a>
                            <a class="ghost-btn" href="/edit-project.html?id=${project.id}">${escapeHtml(t("author.project.edit", "Edit"))}</a>
                        </div>
                        ${canSubmit ? `<button class="primary-btn small-btn" type="button" data-submit-id="${project.id}">${escapeHtml(t("author.project.submit", "Submit"))}</button>` : ""}
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function renderAuthorProjectCover(project) {
    const className = "project-card-cover author-project-card-cover";
    if (project?.hasCoverImage && project?.id) {
        return `<img class="${className} project-cover-image" src="/api/projects/${encodeURIComponent(project.id)}/image" alt="${escapeHtml(project.title ?? "Project")}">`;
    }

    const category = project.categoryTitle ?? t("app.project", "Project");
    const initials = getInitials(project.title || "PR");
    const tone = resolveAuthorProjectTone(project);
    return `
        <div class="${className} ${tone}">
            <div class="project-cover-glow"></div>
            <div class="project-cover-copy">
                <strong>${escapeHtml(initials)}</strong>
                <span>${escapeHtml(category)}</span>
            </div>
        </div>
    `;
}

function resolveAuthorProjectProgress(project) {
    const goal = normalizeNumber(project.goalAmount);
    if (!goal) {
        return 0;
    }
    return Math.round((normalizeNumber(project.collectedAmount) / goal) * 100);
}

function resolveAuthorProjectTone(project) {
    const source = `${project?.categoryTitle ?? ""}:${project?.title ?? ""}`;
    const tones = ["cover-violet", "cover-sky", "cover-green", "cover-amber", "cover-coral"];
    let hash = 0;

    for (const symbol of source) {
        hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    }

    return tones[hash % tones.length];
}

authorProjectsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-submit-id]");
    if (!button) {
        return;
    }

    setAuthorStatus(t("author.status.submitting", "Submitting project for moderation..."), "info");
    const response = await fetch(`/api/me/projects/${button.getAttribute("data-submit-id")}/submit`, {
        method: "POST",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        setAuthorStatus(t("author.status.submitError", "Could not submit project for moderation"), "error");
        return;
    }

    setAuthorStatus(t("author.status.submitted", "Project submitted for moderation"), "success");
    const projects = await loadAuthorProjects();
    currentAuthorProjects = projects;
    renderDashboardStats(projects);
    renderRecentActivities(projects);
    renderAuthorProjects(projects);
});

function readStoredAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function setAuthorStatus(message, type = "") {
    authorStatusNode.textContent = message;
    authorStatusNode.className = `auth-status ${type}`.trim();
}

async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setAuthorStatus(t("author.status.avatarTooLarge", "Avatar must be 5 MB or smaller"), "error");
        event.target.value = "";
        return;
    }

    if (!file.type.startsWith("image/")) {
        setAuthorStatus(t("author.status.avatarImageOnly", "Please choose an image file"), "error");
        event.target.value = "";
        return;
    }

    const croppedAvatar = await openAvatarCropper({
        file,
        kicker: t("avatar.crop.kicker", "Avatar"),
        title: t("avatar.crop.title", "Adjust visible area"),
        hint: t("avatar.crop.hint", "Drag the image and choose which part will be shown."),
        zoomLabel: t("avatar.crop.zoom", "Zoom"),
        resetLabel: t("avatar.crop.reset", "Reset"),
        cancelLabel: t("avatar.crop.cancel", "Cancel"),
        saveLabel: t("avatar.crop.save", "Apply")
    }).catch(() => null);
    if (!croppedAvatar) {
        setAuthorStatus(t("avatar.crop.error", "Could not open avatar editor"), "error");
        event.target.value = "";
        return;
    }

    const uploadFile = new File([croppedAvatar], "avatar.png", {type: "image/png"});

    setAvatarPreviewUrl(URL.createObjectURL(uploadFile));
    setAuthorStatus(t("author.status.avatarSaving", "Saving avatar..."), "info");

    const formData = new FormData();
    formData.append("avatar", uploadFile);

    const response = await fetch("/api/me/avatar", {
        method: "POST",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        await loadAuthorAvatar(currentProfileHasAvatar);
        setAuthorStatus(t("author.status.avatarSaveError", "Could not save avatar"), "error");
        event.target.value = "";
        return;
    }

    currentProfileHasAvatar = true;
    await loadAuthorAvatar(true);
    setAuthorStatus(t("author.status.avatarSaved", "Avatar saved"), "success");
    event.target.value = "";
}

async function loadAuthorAvatar(hasAvatar) {
    if (!hasAvatar) {
        showAvatarFallback(authorNameNode.textContent.trim());
        return;
    }

    const response = await fetch("/api/me/avatar", {
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        showAvatarFallback(authorNameNode.textContent.trim());
        return;
    }

    const blob = await response.blob();
    setAvatarPreviewUrl(URL.createObjectURL(blob));
}

function showAvatarFallback(displayName) {
    revokeCurrentAvatarUrl();
    authorAvatarPreviewNode.classList.add("hidden");
    authorAvatarFallbackNode.classList.remove("hidden");
    authorAvatarFallbackNode.textContent = getInitials(displayName);
}

function setAvatarPreviewUrl(url) {
    revokeCurrentAvatarUrl();
    currentAvatarObjectUrl = url;
    authorAvatarPreviewNode.src = url;
    authorAvatarPreviewNode.classList.remove("hidden");
    authorAvatarFallbackNode.classList.add("hidden");
}

function revokeCurrentAvatarUrl() {
    if (currentAvatarObjectUrl) {
        URL.revokeObjectURL(currentAvatarObjectUrl);
        currentAvatarObjectUrl = "";
    }
}

function getInitials(value) {
    return String(value || "AU")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "AU";
}

function isSuccessfulProject(project) {
    return project.status === "FUNDED" || normalizeNumber(project.collectedAmount) >= normalizeNumber(project.goalAmount);
}

function normalizeNumber(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function resolveCurrency(projects) {
    return projects.find((project) => project.currency)?.currency || "RUB";
}

function formatMoney(value, currency = "RUB") {
    return new Intl.NumberFormat(resolveAuthorLocale(), {
        style: "currency",
        currency,
        maximumFractionDigits: 0
    }).format(normalizeNumber(value));
}

function resolveCurrencyIcon(currency) {
    switch (String(currency || "").toUpperCase()) {
        case "USD":
            return "$";
        case "EUR":
            return "€";
        default:
            return "₽";
    }
}

function formatAuthorDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat(resolveAuthorLocale(), {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
}

function formatProjectStatus(status) {
    return t(`project.status.${status}`, status || "UNKNOWN");
}

function formatAuthorGuideTip(key, fallback, statusCodes) {
    return statusCodes.reduce(
        (text, statusCode) => text.replaceAll(statusCode, formatProjectStatus(statusCode)),
        t(key, fallback)
    );
}

function formatActivityVerb(verb) {
    return String(verb ?? "").replaceAll("обновлен", "обновлён");
}

function formatActivityDescription(verb, status) {
    return t("author.activity.description", "Project {verb}, status: {status}.")
        .replace("{verb}", verb)
        .replace("{status}", formatProjectStatus(status || "UNKNOWN"));
}

function applyAuthorStaticTranslations() {
    document.title = t("author.title", "Author Dashboard | RiseUp");
    authorAvatarPreviewNode.alt = t("author.avatar.alt", "User avatar");
    authorAvatarUploadLabelNode.setAttribute("aria-label", t("author.avatar.upload", "Upload avatar"));
    authorProfileKickerNode.textContent = t("author.profile.kicker", "Author profile");
    authorRegistrationLabelNode.textContent = t("author.profile.registeredAt", "Registration date");
    authorEmailLabelNode.textContent = t("author.profile.email", "Email");
    authorHomeLinkNode.textContent = t("author.action.home", "Back home");
    authorNewProjectLinkNode.textContent = t("author.action.newProject", "New project");
    authorBioEditButtonNode.textContent = t("author.bio.edit", "Edit");
    authorBioSaveButtonNode.textContent = t("author.bio.save", "Save");
    authorBioCancelButtonNode.textContent = t("author.bio.cancel", "Cancel");
    authorActivityKickerNode.textContent = t("author.activity.kicker", "Activity");
    authorActivityTitleNode.textContent = t("author.activity.title", "Recent activity");
    authorGuideKickerNode.textContent = t("author.guide.kicker", "Statuses");
    authorGuideTitleNode.textContent = t("author.guide.title", "What happens to projects");
    authorProjectsKickerNode.textContent = t("author.projects.kicker", "Projects");
    authorProjectsTitleNode.textContent = t("author.projects.title", "Your campaigns");
    authorBioFormNode.querySelector(".author-bio-label").textContent = t("author.bio.label", "About");
    authorGuideListNode.innerHTML = `
        <li>${escapeHtml(formatAuthorGuideTip("author.guide.tip1", "DRAFT — the project is still being edited and is not public yet.", ["DRAFT"]))}</li>
        <li>${escapeHtml(formatAuthorGuideTip("author.guide.tip2", "MODERATION — the project is waiting for admin review.", ["MODERATION"]))}</li>
        <li>${escapeHtml(formatAuthorGuideTip("author.guide.tip3", "ACTIVE — the project is published and accepting support.", ["ACTIVE"]))}</li>
        <li>${escapeHtml(formatAuthorGuideTip("author.guide.tip4", "FUNDED and CLOSED — final campaign states.", ["FUNDED", "CLOSED"]))}</li>
    `;
}

function t(key, fallback) {
    return window.AppI18n?.t?.(key) ?? fallback;
}

function resolveAuthorLocale() {
    return window.AppI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function openAvatarCropper(options) {
    const image = await loadAvatarCropperImage(options.file);
    return new Promise((resolve) => {
        const outputSize = 512;
        const modal = document.createElement("div");
        modal.className = "avatar-cropper-modal";
        modal.innerHTML = `
            <div class="avatar-cropper-dialog">
                <div class="avatar-cropper-head">
                    <div>
                        <p class="panel-kicker">${escapeHtml(options.kicker || "")}</p>
                        <h3>${escapeHtml(options.title || "Adjust avatar")}</h3>
                    </div>
                </div>
                <div class="avatar-cropper-body">
                    <div class="avatar-cropper-stage">
                        <canvas class="avatar-cropper-canvas" width="${outputSize}" height="${outputSize}"></canvas>
                        <div class="avatar-cropper-mask"></div>
                    </div>
                    <div class="avatar-cropper-controls">
                        <label class="avatar-cropper-zoom">
                            <span>${escapeHtml(options.zoomLabel || "Zoom")}</span>
                            <input type="range" min="1" max="4" step="0.01" value="1">
                        </label>
                        <p class="avatar-cropper-hint">${escapeHtml(options.hint || "Drag the image to choose the visible area.")}</p>
                    </div>
                </div>
                <div class="avatar-cropper-actions">
                    <button type="button" class="ghost-btn avatar-cropper-reset">${escapeHtml(options.resetLabel || "Reset")}</button>
                    <button type="button" class="ghost-btn avatar-cropper-cancel">${escapeHtml(options.cancelLabel || "Cancel")}</button>
                    <button type="button" class="primary-btn avatar-cropper-save">${escapeHtml(options.saveLabel || "Apply")}</button>
                </div>
            </div>
        `;

        const canvas = modal.querySelector(".avatar-cropper-canvas");
        const context = canvas.getContext("2d");
        const zoomInput = modal.querySelector("input[type='range']");
        const resetButton = modal.querySelector(".avatar-cropper-reset");
        const cancelButton = modal.querySelector(".avatar-cropper-cancel");
        const saveButton = modal.querySelector(".avatar-cropper-save");
        const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight);

        let zoom = 1;
        let offsetX = 0;
        let offsetY = 0;
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startOffsetX = 0;
        let startOffsetY = 0;

        function clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        function constrainOffsets() {
            const scaledWidth = image.naturalWidth * baseScale * zoom;
            const scaledHeight = image.naturalHeight * baseScale * zoom;
            const limitX = Math.max((scaledWidth - outputSize) / 2, 0);
            const limitY = Math.max((scaledHeight - outputSize) / 2, 0);
            offsetX = clamp(offsetX, -limitX, limitX);
            offsetY = clamp(offsetY, -limitY, limitY);
        }

        function render() {
            constrainOffsets();
            const scaledWidth = image.naturalWidth * baseScale * zoom;
            const scaledHeight = image.naturalHeight * baseScale * zoom;
            const drawX = (outputSize - scaledWidth) / 2 + offsetX;
            const drawY = (outputSize - scaledHeight) / 2 + offsetY;
            context.clearRect(0, 0, outputSize, outputSize);
            context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
        }

        function close(result) {
            modal.remove();
            document.body.classList.remove("avatar-cropper-open");
            resolve(result);
        }

        function resetView() {
            zoom = 1;
            offsetX = 0;
            offsetY = 0;
            zoomInput.value = "1";
            render();
        }

        canvas.addEventListener("pointerdown", (event) => {
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            startOffsetX = offsetX;
            startOffsetY = offsetY;
            canvas.setPointerCapture?.(event.pointerId);
            modal.classList.add("is-dragging");
        });

        canvas.addEventListener("pointermove", (event) => {
            if (!dragging) {
                return;
            }
            offsetX = startOffsetX + (event.clientX - startX);
            offsetY = startOffsetY + (event.clientY - startY);
            render();
        });

        function stopDragging(event) {
            dragging = false;
            canvas.releasePointerCapture?.(event.pointerId);
            modal.classList.remove("is-dragging");
        }

        canvas.addEventListener("pointerup", stopDragging);
        canvas.addEventListener("pointercancel", stopDragging);

        zoomInput.addEventListener("input", () => {
            zoom = Number(zoomInput.value);
            render();
        });

        canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            const nextZoom = clamp(zoom + (event.deltaY < 0 ? 0.12 : -0.12), 1, 4);
            zoom = nextZoom;
            zoomInput.value = `${nextZoom}`;
            render();
        }, {passive: false});

        resetButton.addEventListener("click", resetView);
        cancelButton.addEventListener("click", () => close(null));
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                close(null);
            }
        });
        saveButton.addEventListener("click", () => {
            canvas.toBlob((blob) => close(blob || null), "image/png");
        });

        document.body.appendChild(modal);
        document.body.classList.add("avatar-cropper-open");
        resetView();
    });
}

function loadAvatarCropperImage(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not load image"));
        };
        image.src = objectUrl;
    });
}
