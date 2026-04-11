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
    setAuthorStatus(t("author.status.loadingProfile", "Загружаем профиль..."), "info");

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
        throw new Error(t("author.status.profileError", "Не удалось загрузить профиль автора"));
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
        throw new Error(t("author.status.projectsError", "Не удалось загрузить проекты автора"));
    }

    const payload = await response.json();
    return payload.content ?? [];
}

function renderAuthorProfile(profile) {
    const displayName = profile.displayName || (profile.email || "author").split("@")[0];
    currentProfileHasAvatar = Boolean(profile.hasAvatar);

    document.title = t("author.title", "Author Dashboard | RiseUp");
    authorNameNode.textContent = displayName;
    authorBioNode.textContent = profile.bio || t("author.bio", "Ведущий разработчик, создаю open-source проекты.");
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
        setAuthorStatus(t("author.status.bioRequired", "Заполните описание профиля"), "error");
        return;
    }

    setAuthorStatus(t("author.status.bioSaving", "Сохраняем описание..."), "info");

    const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({bio})
    });

    if (!response.ok) {
        setAuthorStatus(t("author.status.bioSaveError", "Не удалось сохранить описание"), "error");
        return;
    }

    currentAuthorProfile = await response.json();
    renderAuthorProfile(currentAuthorProfile);
    await loadAuthorAvatar(currentProfileHasAvatar);
    closeBioEditor();
    setAuthorStatus(t("author.status.bioSaved", "Описание сохранено"), "success");
}

function renderDashboardStats(projects) {
    const totalProjects = projects.length;
    const successfulProjects = projects.filter(isSuccessfulProject).length;
    const successRate = totalProjects ? Math.round((successfulProjects / totalProjects) * 100) : 0;
    const totalCollected = projects.reduce((sum, project) => sum + normalizeNumber(project.collectedAmount), 0);
    const currency = resolveCurrency(projects);

    const stats = [
        { title: t("author.stats.totalProjects", "Всего проектов"), value: String(totalProjects), icon: "◼", accentClass: "accent-violet" },
        { title: t("author.stats.successfulProjects", "Успешных сборов"), value: String(successfulProjects), icon: "↗", accentClass: "accent-green" },
        { title: t("author.stats.successRate", "Процент успеха"), value: `${successRate}%`, icon: "%", accentClass: "accent-cyan" },
        { title: t("author.stats.totalRaised", "Собрано всего"), value: formatMoney(totalCollected, currency), icon: resolveCurrencyIcon(currency), accentClass: "accent-orange" }
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
                ? t("author.activity.updated", "обновлен")
                : t("author.activity.created", "создан");
            return `
                <li class="author-activity-item">
                    <div class="author-activity-dot"></div>
                    <div>
                        <strong>${escapeHtml(project.title || t("author.project.untitled", "Без названия"))}</strong>
                        <p>${escapeHtml(formatActivityDescription(verb, project.status))}</p>
                        <span>${escapeHtml(dateLabel)}</span>
                    </div>
                </li>
            `;
        });

    authorActivitiesNode.innerHTML = activities.length
        ? activities.join("")
        : `<li class="empty-state">${escapeHtml(t("author.activity.empty", "Пока нет активности. Создайте первый проект, чтобы кабинет ожил."))}</li>`;
}

function renderAuthorProjects(projects) {
    if (!projects.length) {
        authorProjectsNode.innerHTML = `<div class="empty-state">${escapeHtml(t("author.projects.empty", "У вас пока нет проектов."))}</div>`;
        return;
    }

    authorProjectsNode.innerHTML = projects.map((project) => {
        const canEdit = project.status === "DRAFT" || project.status === "REJECTED";
        const canSubmit = canEdit;
        return `
            <article class="project-card">
                <div class="project-card-header">
                    <span class="status-badge">${escapeHtml(formatProjectStatus(project.status))}</span>
                    <span class="meta-pill">${escapeHtml(project.categoryTitle ?? t("app.general", "General"))}</span>
                </div>
                <h4>${escapeHtml(project.title)}</h4>
                <p>${escapeHtml(project.shortDescription ?? "")}</p>
                <div class="project-meta">
                    <span>${escapeHtml(t("author.project.raised", "Собрано"))}: ${escapeHtml(formatMoney(project.collectedAmount, project.currency))}</span>
                    <span>${escapeHtml(t("author.project.goal", "Цель"))}: ${escapeHtml(formatMoney(project.goalAmount, project.currency))}</span>
                </div>
                ${project.rejectionReason ? `<div class="project-rejection-note"><strong>${escapeHtml(t("author.project.moderationNote", "Комментарий модерации"))}:</strong> ${escapeHtml(project.rejectionReason)}</div>` : ""}
                <div class="project-card-footer">
                    <div class="project-card-footer-actions">
                        <a class="ghost-btn" href="/project.html?id=${project.id}">${escapeHtml(t("author.project.open", "Открыть"))}</a>
                        ${canEdit ? `<a class="ghost-btn" href="/edit-project.html?id=${project.id}">${escapeHtml(t("author.project.edit", "Редактировать"))}</a>` : ""}
                    </div>
                    ${canSubmit ? `<button class="primary-btn small-btn" type="button" data-submit-id="${project.id}">${escapeHtml(t("author.project.submit", "На модерацию"))}</button>` : ""}
                </div>
            </article>
        `;
    }).join("");
}

authorProjectsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-submit-id]");
    if (!button) {
        return;
    }

    setAuthorStatus(t("author.status.submitting", "Отправляем проект на модерацию..."), "info");
    const response = await fetch(`/api/me/projects/${button.getAttribute("data-submit-id")}/submit`, {
        method: "POST",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        setAuthorStatus(t("author.status.submitError", "Не удалось отправить проект на модерацию"), "error");
        return;
    }

    setAuthorStatus(t("author.status.submitted", "Проект отправлен на модерацию"), "success");
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
        setAuthorStatus(t("author.status.avatarTooLarge", "Аватар должен быть не больше 5 МБ"), "error");
        event.target.value = "";
        return;
    }

    if (!file.type.startsWith("image/")) {
        setAuthorStatus(t("author.status.avatarImageOnly", "Можно выбрать только изображение"), "error");
        event.target.value = "";
        return;
    }

    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAuthorStatus(t("author.status.avatarSaving", "Сохраняем аватар..."), "info");

    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("/api/me/avatar", {
        method: "POST",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        await loadAuthorAvatar(currentProfileHasAvatar);
        setAuthorStatus(t("author.status.avatarSaveError", "Не удалось сохранить аватар"), "error");
        event.target.value = "";
        return;
    }

    currentProfileHasAvatar = true;
    await loadAuthorAvatar(true);
    setAuthorStatus(t("author.status.avatarSaved", "Аватар сохранен"), "success");
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

function formatActivityDescription(verb, status) {
    return t("author.activity.description", "Проект {verb}, статус: {status}.")
        .replace("{verb}", verb)
        .replace("{status}", formatProjectStatus(status || "UNKNOWN"));
}

function applyAuthorStaticTranslations() {
    document.title = t("author.title", "Author Dashboard | RiseUp");
    authorAvatarPreviewNode.alt = t("author.avatar.alt", "Аватар пользователя");
    authorAvatarUploadLabelNode.setAttribute("aria-label", t("author.avatar.upload", "Загрузить аватар"));
    authorProfileKickerNode.textContent = t("author.profile.kicker", "Профиль автора");
    authorRegistrationLabelNode.textContent = t("author.profile.registeredAt", "Дата регистрации");
    authorEmailLabelNode.textContent = t("author.profile.email", "Email");
    authorHomeLinkNode.textContent = t("author.action.home", "На главную");
    authorNewProjectLinkNode.textContent = t("author.action.newProject", "Новый проект");
    authorBioEditButtonNode.textContent = t("author.bio.edit", "Редактировать");
    authorBioSaveButtonNode.textContent = t("author.bio.save", "Сохранить");
    authorBioCancelButtonNode.textContent = t("author.bio.cancel", "Отмена");
    authorActivityKickerNode.textContent = t("author.activity.kicker", "Активность");
    authorActivityTitleNode.textContent = t("author.activity.title", "Последние действия");
    authorGuideKickerNode.textContent = t("author.guide.kicker", "Статусы");
    authorGuideTitleNode.textContent = t("author.guide.title", "Что происходит с проектами");
    authorProjectsKickerNode.textContent = t("author.projects.kicker", "Проекты");
    authorProjectsTitleNode.textContent = t("author.projects.title", "Ваши кампании");
    authorBioFormNode.querySelector(".author-bio-label").textContent = t("author.bio.label", "О себе");
    authorGuideListNode.innerHTML = `
        <li><strong>DRAFT</strong> - ${escapeHtml(t("author.guide.tip1", "проект еще редактируется и не виден публично."))}</li>
        <li><strong>MODERATION</strong> - ${escapeHtml(t("author.guide.tip2", "проект ожидает проверки администратором."))}</li>
        <li><strong>ACTIVE</strong> - ${escapeHtml(t("author.guide.tip3", "проект опубликован и собирает средства."))}</li>
        <li><strong>FUNDED</strong> / <strong>CLOSED</strong> - ${escapeHtml(t("author.guide.tip4", "финальные состояния кампании."))}</li>
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
