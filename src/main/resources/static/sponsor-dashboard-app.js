const sponsorAuth = readSponsorAuth();
const sponsorProjectsNode = document.getElementById("sponsor-projects");
const sponsorStatusNode = document.getElementById("sponsor-status");
const sponsorStatsNode = document.getElementById("sponsor-stats");
const sponsorActivitiesNode = document.getElementById("sponsor-activities");
const sponsorNameNode = document.getElementById("sponsor-name");
const sponsorBioNode = document.getElementById("sponsor-bio");
const sponsorEmailNode = document.getElementById("sponsor-email");
const sponsorRegistrationDateNode = document.getElementById("sponsor-registration-date");
const sponsorProfileKickerNode = document.getElementById("sponsor-profile-kicker");
const sponsorRegistrationLabelNode = document.getElementById("sponsor-registration-label");
const sponsorEmailLabelNode = document.getElementById("sponsor-email-label");
const sponsorHomeLinkNode = document.getElementById("sponsor-home-link");
const sponsorProjectsLinkNode = document.getElementById("sponsor-projects-link");
const sponsorActivityKickerNode = document.getElementById("sponsor-activity-kicker");
const sponsorActivityTitleNode = document.getElementById("sponsor-activity-title");
const sponsorGuideKickerNode = document.getElementById("sponsor-guide-kicker");
const sponsorGuideTitleNode = document.getElementById("sponsor-guide-title");
const sponsorGuideListNode = document.getElementById("sponsor-guide-list");
const sponsorProjectsKickerNode = document.getElementById("sponsor-projects-kicker");
const sponsorProjectsTitleNode = document.getElementById("sponsor-projects-title");
const sponsorAvatarPreviewNode = document.getElementById("sponsor-avatar-preview");
const sponsorAvatarFallbackNode = document.getElementById("sponsor-avatar-fallback");
const sponsorAvatarUploadLabelNode = document.getElementById("sponsor-avatar-upload-label");
const sponsorAvatarInputNode = document.getElementById("sponsor-avatar-input");
let sponsorAvatarObjectUrl = "";
let currentSponsorProfile = null;
let currentSponsorDonations = [];

if (!sponsorAuth?.accessToken) {
    window.location.href = "/auth.html";
}

initializeSponsorDashboard().catch((error) => setSponsorStatus(error.message, "error"));

sponsorAvatarInputNode?.addEventListener("change", handleSponsorAvatarChange);

document.addEventListener("app:lang-changed", () => {
    applySponsorStaticTranslations();
    if (currentSponsorProfile) {
        renderSponsorProfile(currentSponsorProfile);
        void loadSponsorAvatar(Boolean(currentSponsorProfile.hasAvatar));
    }
    renderSponsorStats(currentSponsorDonations);
    renderSponsorActivities(currentSponsorDonations);
    renderSponsorProjects(currentSponsorDonations);
});

async function initializeSponsorDashboard() {
    applySponsorStaticTranslations();
    setSponsorStatus(t("sponsor.status.loadingProfile", "Загружаем кабинет спонсора..."), "info");

    const [profile, donations] = await Promise.all([
        loadSponsorProfile(),
        loadSponsorDonations()
    ]);

    currentSponsorProfile = profile;
    currentSponsorDonations = donations;
    renderSponsorProfile(profile);
    await loadSponsorAvatar(Boolean(profile.hasAvatar));
    renderSponsorStats(donations);
    renderSponsorActivities(donations);
    renderSponsorProjects(donations);
    setSponsorStatus("", "");
}

async function loadSponsorProfile() {
    const response = await fetch("/api/auth/me", {
        headers: {
            "Authorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(t("sponsor.status.profileError", "Не удалось загрузить профиль спонсора"));
    }

    return response.json();
}

async function loadSponsorDonations() {
    const response = await fetch("/api/me/donations?size=24", {
        headers: {
            "Authorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(t("sponsor.status.donationsError", "Не удалось загрузить историю пожертвований"));
    }

    const payload = await response.json();
    return payload.content ?? [];
}

function renderSponsorProfile(profile) {
    const displayName = profile.displayName || (profile.email || "sponsor").split("@")[0];
    sponsorNameNode.textContent = displayName;
    sponsorBioNode.textContent = profile.bio || t("sponsor.bio", "Поддерживаю проекты, которые делают платформу сильнее.");
    sponsorEmailNode.textContent = profile.email || "-";
    sponsorRegistrationDateNode.textContent = formatSponsorDate(profile.createdAt);
    sponsorAvatarFallbackNode.textContent = getSponsorInitials(displayName);
    document.title = t("sponsor.title", "Sponsor Dashboard | RiseUp");
    showSponsorAvatarFallback(displayName);
}

function renderSponsorStats(donations) {
    const totalDonations = donations.length;
    const successfulDonations = donations.filter((item) => item.status === "SUCCEEDED").length;
    const supportedProjects = new Set(donations.map((item) => item.projectId).filter(Boolean)).size;
    const totalAmount = donations.reduce((sum, item) => sum + normalizeSponsorNumber(item.amount), 0);

    const stats = [
        { title: t("sponsor.stats.totalDonations", "Всего пожертвований"), value: String(totalDonations), icon: "◼", accentClass: "accent-violet" },
        { title: t("sponsor.stats.successfulDonations", "Успешных платежей"), value: String(successfulDonations), icon: "↗", accentClass: "accent-green" },
        { title: t("sponsor.stats.supportedProjects", "Поддержано проектов"), value: String(supportedProjects), icon: "#", accentClass: "accent-cyan" },
        { title: t("sponsor.stats.totalAmount", "Сумма поддержки"), value: formatSponsorMoney(totalAmount), icon: "₽", accentClass: "accent-orange" }
    ];

    sponsorStatsNode.innerHTML = stats.map((stat) => `
        <article class="stat-card ${stat.accentClass}">
            <div class="stat-head">
                <span class="stat-link stat-link-static">${escapeSponsorHtml(stat.title)}</span>
                <span class="stat-icon stat-icon-soft">${escapeSponsorHtml(stat.icon)}</span>
            </div>
            <div class="stat-copy">
                <h2>${escapeSponsorHtml(stat.value)}</h2>
                <p>${escapeSponsorHtml(stat.title)}</p>
            </div>
            <div class="mini-bars mini-bars-soft">
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
            </div>
        </article>
    `).join("");
}

function renderSponsorActivities(donations) {
    const activities = donations
        .slice()
        .sort((left, right) => new Date(right.confirmedAt || right.createdAt || 0) - new Date(left.confirmedAt || left.createdAt || 0))
        .slice(0, 3)
        .map((item) => `
            <li class="author-activity-item">
                <div class="author-activity-dot"></div>
                <div>
                    <strong>${escapeSponsorHtml(item.projectTitle || t("sponsor.project.untitled", "Без названия"))}</strong>
                    <p>${escapeSponsorHtml(formatSponsorActivity(item))}</p>
                    <span>${escapeSponsorHtml(formatSponsorDate(item.confirmedAt || item.createdAt))}</span>
                </div>
            </li>
        `);

    sponsorActivitiesNode.innerHTML = activities.length
        ? activities.join("")
        : `<li class="empty-state">${escapeSponsorHtml(t("sponsor.activity.empty", "Пока нет пожертвований. Выберите проект и поддержите его."))}</li>`;
}

function renderSponsorProjects(items) {
    if (!items.length) {
        sponsorProjectsNode.innerHTML = `<div class="empty-state">${escapeSponsorHtml(t("sponsor.projects.empty", "Вы еще не поддержали ни одного проекта."))}</div>`;
        return;
    }

    sponsorProjectsNode.innerHTML = items.map((item) => `
        <article class="project-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeSponsorHtml(formatSponsorStatus(item.status))}</span>
                <span class="meta-pill">${escapeSponsorHtml(item.provider ?? t("sponsor.project.provider", "Провайдер"))}</span>
            </div>
            <h4>${escapeSponsorHtml(item.projectTitle ?? t("sponsor.project.untitled", "Без названия"))}</h4>
            <p>${escapeSponsorHtml(t("sponsor.project.amount", "Сумма пожертвования"))}: ${escapeSponsorHtml(formatSponsorMoney(item.amount))}</p>
            <div class="project-meta">
                <span>${escapeSponsorHtml(t("sponsor.project.paymentId", "Платеж"))}: ${escapeSponsorHtml(item.externalPaymentId ?? t("sponsor.project.noPaymentId", "Без id"))}</span>
                <span>${escapeSponsorHtml(formatSponsorDate(item.confirmedAt || item.createdAt))}</span>
            </div>
            <div class="project-card-footer">
                <strong>${escapeSponsorHtml(item.provider ?? "-")}</strong>
                <div class="project-card-footer-actions">
                    <a class="ghost-btn" href="/project.html?id=${item.projectId}">${escapeSponsorHtml(t("sponsor.project.open", "Открыть проект"))}</a>
                </div>
            </div>
        </article>
    `).join("");
}

async function loadSponsorAvatar(hasAvatar) {
    if (!hasAvatar) {
        showSponsorAvatarFallback(sponsorNameNode.textContent.trim());
        return;
    }

    const response = await fetch("/api/me/avatar", {
        headers: {
            "Authorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        showSponsorAvatarFallback(sponsorNameNode.textContent.trim());
        return;
    }

    const blob = await response.blob();
    setSponsorAvatarPreview(URL.createObjectURL(blob));
}

async function handleSponsorAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setSponsorStatus(t("sponsor.status.avatarTooLarge", "Аватар должен быть не больше 5 МБ"), "error");
        event.target.value = "";
        return;
    }

    if (!file.type.startsWith("image/")) {
        setSponsorStatus(t("sponsor.status.avatarImageOnly", "Можно выбрать только изображение"), "error");
        event.target.value = "";
        return;
    }

    setSponsorAvatarPreview(URL.createObjectURL(file));
    setSponsorStatus(t("sponsor.status.avatarSaving", "Сохраняем аватар..."), "info");

    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("/api/me/avatar", {
        method: "POST",
        headers: {
            "Authorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        await loadSponsorAvatar(Boolean(currentSponsorProfile?.hasAvatar));
        setSponsorStatus(t("sponsor.status.avatarSaveError", "Не удалось сохранить аватар"), "error");
        event.target.value = "";
        return;
    }

    if (currentSponsorProfile) {
        currentSponsorProfile.hasAvatar = true;
    }
    await loadSponsorAvatar(true);
    setSponsorStatus(t("sponsor.status.avatarSaved", "Аватар сохранен"), "success");
    event.target.value = "";
}

function setSponsorAvatarPreview(url) {
    revokeSponsorAvatarUrl();
    sponsorAvatarObjectUrl = url;
    sponsorAvatarPreviewNode.src = url;
    sponsorAvatarPreviewNode.classList.remove("hidden");
    sponsorAvatarFallbackNode.classList.add("hidden");
}

function showSponsorAvatarFallback(displayName) {
    revokeSponsorAvatarUrl();
    sponsorAvatarPreviewNode.classList.add("hidden");
    sponsorAvatarFallbackNode.classList.remove("hidden");
    sponsorAvatarFallbackNode.textContent = getSponsorInitials(displayName);
}

function revokeSponsorAvatarUrl() {
    if (sponsorAvatarObjectUrl) {
        URL.revokeObjectURL(sponsorAvatarObjectUrl);
        sponsorAvatarObjectUrl = "";
    }
}

function formatSponsorActivity(item) {
    return t("sponsor.activity.description", "Поддержан проект {title}, сумма: {amount}, статус: {status}.")
        .replace("{title}", item.projectTitle || t("sponsor.project.untitled", "Без названия"))
        .replace("{amount}", formatSponsorMoney(item.amount))
        .replace("{status}", formatSponsorStatus(item.status));
}

function formatSponsorStatus(status) {
    return t(`donation.status.${status}`, status || "UNKNOWN");
}

function formatSponsorMoney(value) {
    return new Intl.NumberFormat(resolveSponsorLocale(), {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0
    }).format(normalizeSponsorNumber(value));
}

function normalizeSponsorNumber(value) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatSponsorDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat(resolveSponsorLocale(), {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
}

function getSponsorInitials(value) {
    return String(value || "SP")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "SP";
}

function readSponsorAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function setSponsorStatus(message, type = "") {
    sponsorStatusNode.textContent = message;
    sponsorStatusNode.className = `auth-status ${type}`.trim();
}

function applySponsorStaticTranslations() {
    document.title = t("sponsor.title", "Sponsor Dashboard | RiseUp");
    sponsorAvatarPreviewNode.alt = t("sponsor.avatar.alt", "Аватар спонсора");
    sponsorAvatarUploadLabelNode.setAttribute("aria-label", t("sponsor.avatar.upload", "Загрузить аватар"));
    sponsorProfileKickerNode.textContent = t("sponsor.profile.kicker", "Профиль спонсора");
    sponsorRegistrationLabelNode.textContent = t("sponsor.profile.registeredAt", "Дата регистрации");
    sponsorEmailLabelNode.textContent = t("sponsor.profile.email", "Email");
    sponsorHomeLinkNode.textContent = t("sponsor.action.home", "На главную");
    sponsorProjectsLinkNode.textContent = t("sponsor.action.findProject", "Найти проект");
    sponsorActivityKickerNode.textContent = t("sponsor.activity.kicker", "Активность");
    sponsorActivityTitleNode.textContent = t("sponsor.activity.title", "Последние пожертвования");
    sponsorGuideKickerNode.textContent = t("sponsor.guide.kicker", "История");
    sponsorGuideTitleNode.textContent = t("sponsor.guide.title", "Что отображается в кабинете");
    sponsorProjectsKickerNode.textContent = t("sponsor.projects.kicker", "Поддержка");
    sponsorProjectsTitleNode.textContent = t("sponsor.projects.title", "Ваши пожертвования");
    sponsorGuideListNode.innerHTML = `
        <li>${escapeSponsorHtml(t("sponsor.guide.tip1", "Все проекты, которые вы поддержали."))}</li>
        <li>${escapeSponsorHtml(t("sponsor.guide.tip2", "Сумма пожертвования и статус платежа."))}</li>
        <li>${escapeSponsorHtml(t("sponsor.guide.tip3", "Быстрый переход к публичной карточке проекта."))}</li>
    `;
}

function escapeSponsorHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function resolveSponsorLocale() {
    return window.AppI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}

function t(key, fallback) {
    return window.AppI18n?.t?.(key) ?? fallback;
}
