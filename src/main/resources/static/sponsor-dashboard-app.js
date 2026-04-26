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
    setSponsorStatus(t("sponsor.status.loadingProfile", "Loading sponsor dashboard..."), "info");

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
        throw new Error(t("sponsor.status.profileError", "Could not load sponsor profile"));
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
        throw new Error(t("sponsor.status.donationsError", "Could not load donations history"));
    }

    const payload = await response.json();
    return payload.content ?? [];
}

function renderSponsorProfile(profile) {
    const displayName = profile.displayName || (profile.email || "sponsor").split("@")[0];
    sponsorNameNode.textContent = displayName;
    sponsorBioNode.textContent = profile.bio || t("sponsor.bio", "I support projects that make the platform stronger.");
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
        { title: t("sponsor.stats.totalDonations", "Total donations"), value: String(totalDonations), icon: "◣", accentClass: "accent-violet" },
        { title: t("sponsor.stats.successfulDonations", "Successful payments"), value: String(successfulDonations), icon: "↗", accentClass: "accent-green" },
        { title: t("sponsor.stats.supportedProjects", "Supported projects"), value: String(supportedProjects), icon: "#", accentClass: "accent-cyan" },
        { title: t("sponsor.stats.totalAmount", "Support amount"), value: formatSponsorMoney(totalAmount), icon: "₽", accentClass: "accent-orange" }
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
                    <strong>${escapeSponsorHtml(item.projectTitle || t("sponsor.project.untitled", "Untitled"))}</strong>
                    <p>${escapeSponsorHtml(formatSponsorActivity(item))}</p>
                    <span>${escapeSponsorHtml(formatSponsorDate(item.confirmedAt || item.createdAt))}</span>
                </div>
            </li>
        `);

    sponsorActivitiesNode.innerHTML = activities.length
        ? activities.join("")
        : `<li class="empty-state">${escapeSponsorHtml(t("sponsor.activity.empty", "No donations yet. Pick a project and support it."))}</li>`;
}

function renderSponsorProjects(items) {
    if (!items.length) {
        sponsorProjectsNode.innerHTML = `<div class="empty-state">${escapeSponsorHtml(t("sponsor.projects.empty", "You have not supported any project yet."))}</div>`;
        return;
    }

    sponsorProjectsNode.innerHTML = items.map((item) => `
        <article class="project-card sponsor-support-card">
            <div class="project-card-media sponsor-support-card-media">
                ${renderSponsorProjectCover(item)}
            </div>
            <div class="project-card-content sponsor-support-card-content">
                <div class="sponsor-support-card-topline">
                    <div class="sponsor-support-card-copy">
                        <h4>${escapeSponsorHtml(item.projectTitle ?? t("sponsor.project.untitled", "Untitled"))}</h4>
                        <p>${escapeSponsorHtml(t("sponsor.project.supportedOn", "Supported on"))}: ${escapeSponsorHtml(formatSponsorDate(item.confirmedAt || item.createdAt))}</p>
                    </div>
                    <div class="sponsor-support-card-amount">
                        <span>${escapeSponsorHtml(t("sponsor.project.yourSupport", "Your support"))}</span>
                        <strong>${escapeSponsorHtml(formatSponsorMoney(item.amount))}</strong>
                    </div>
                </div>
                <div class="sponsor-support-card-meta">
                    <span>${escapeSponsorHtml(t("sponsor.project.paymentStatus", "Payment status"))}: ${escapeSponsorHtml(formatSponsorStatus(item.status))}</span>
                    <span>${escapeSponsorHtml(t("sponsor.project.paymentId", "Payment"))}: ${escapeSponsorHtml(item.externalPaymentId ?? t("sponsor.project.noPaymentId", "No id"))}</span>
                </div>
                <div class="project-card-header sponsor-support-card-badges">
                    <span class="status-badge">${escapeSponsorHtml(formatSponsorStatus(item.status))}</span>
                    <span class="meta-pill">${escapeSponsorHtml(item.provider ?? t("sponsor.project.provider", "Provider"))}</span>
                </div>
                <div class="project-card-footer sponsor-support-card-footer">
                    <strong>${escapeSponsorHtml(t("sponsor.project.viaProvider", "Via {provider}").replace("{provider}", item.provider ?? t("sponsor.project.provider", "Provider")))}</strong>
                    <div class="project-card-footer-actions">
                        <a class="ghost-btn" href="/project.html?id=${item.projectId}">${escapeSponsorHtml(t("sponsor.project.open", "Open project"))}</a>
                    </div>
                </div>
            </div>
        </article>
    `).join("");
}

function renderSponsorProjectCover(item) {
    const title = item?.projectTitle ?? t("sponsor.project.untitled", "Project");
    const provider = item?.provider ?? t("sponsor.project.provider", "Provider");
    const className = "project-card-cover sponsor-support-card-cover";
    const tone = resolveSponsorProjectTone(item);
    const initials = getSponsorProjectInitials(title);
    return `
        <div class="${className} ${tone}">
            <div class="project-cover-glow"></div>
            <div class="project-cover-copy">
                <strong>${escapeSponsorHtml(initials)}</strong>
                <span>${escapeSponsorHtml(provider)}</span>
            </div>
        </div>
    `;
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
        setSponsorStatus(t("sponsor.status.avatarTooLarge", "Avatar must be 5 MB or smaller"), "error");
        event.target.value = "";
        return;
    }

    if (!file.type.startsWith("image/")) {
        setSponsorStatus(t("sponsor.status.avatarImageOnly", "Only image files are allowed"), "error");
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
        setSponsorStatus(t("avatar.crop.error", "Could not open avatar editor"), "error");
        event.target.value = "";
        return;
    }

    const uploadFile = new File([croppedAvatar], "avatar.png", {type: "image/png"});

    setSponsorAvatarPreview(URL.createObjectURL(uploadFile));
    setSponsorStatus(t("sponsor.status.avatarSaving", "Saving avatar..."), "info");

    const formData = new FormData();
    formData.append("avatar", uploadFile);

    const response = await fetch("/api/me/avatar", {
        method: "POST",
        headers: {
            "Authorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        await loadSponsorAvatar(Boolean(currentSponsorProfile?.hasAvatar));
        setSponsorStatus(t("sponsor.status.avatarSaveError", "Could not save avatar"), "error");
        event.target.value = "";
        return;
    }

    if (currentSponsorProfile) {
        currentSponsorProfile.hasAvatar = true;
    }
    await loadSponsorAvatar(true);
    setSponsorStatus(t("sponsor.status.avatarSaved", "Avatar saved"), "success");
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
    return t("sponsor.activity.description", "Supported project {title}, amount: {amount}, status: {status}.")
        .replace("{title}", item.projectTitle || t("sponsor.project.untitled", "Untitled"))
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

function getSponsorProjectInitials(value) {
    return String(value || "PR")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "PR";
}

function resolveSponsorProjectTone(item) {
    const source = `${item?.provider ?? ""}:${item?.projectTitle ?? ""}`;
    const tones = ["cover-violet", "cover-sky", "cover-green", "cover-amber", "cover-coral"];
    let hash = 0;

    for (const symbol of source) {
        hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    }

    return tones[hash % tones.length];
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
    sponsorAvatarPreviewNode.alt = t("sponsor.avatar.alt", "Sponsor avatar");
    sponsorAvatarUploadLabelNode.setAttribute("aria-label", t("sponsor.avatar.upload", "Upload avatar"));
    sponsorProfileKickerNode.textContent = t("sponsor.profile.kicker", "Sponsor profile");
    sponsorRegistrationLabelNode.textContent = t("sponsor.profile.registeredAt", "Registration date");
    sponsorEmailLabelNode.textContent = t("sponsor.profile.email", "Email");
    sponsorHomeLinkNode.textContent = t("sponsor.action.home", "Home");
    sponsorProjectsLinkNode.textContent = t("sponsor.action.findProject", "Find a project");
    sponsorActivityKickerNode.textContent = t("sponsor.activity.kicker", "Activity");
    sponsorActivityTitleNode.textContent = t("sponsor.activity.title", "Recent donations");
    sponsorGuideKickerNode.textContent = t("sponsor.guide.kicker", "History");
    sponsorGuideTitleNode.textContent = t("sponsor.guide.title", "What is shown in this dashboard");
    sponsorProjectsKickerNode.textContent = t("sponsor.projects.kicker", "Support");
    sponsorProjectsTitleNode.textContent = t("sponsor.projects.title", "Your donations");
    sponsorGuideListNode.innerHTML = `
        <li>${escapeSponsorHtml(t("sponsor.guide.tip1", "All projects you supported."))}</li>
        <li>${escapeSponsorHtml(t("sponsor.guide.tip2", "Donation amount and payment status."))}</li>
        <li>${escapeSponsorHtml(t("sponsor.guide.tip3", "Quick access to the public project page."))}</li>
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
                        <p class="panel-kicker">${escapeSponsorHtml(options.kicker || "")}</p>
                        <h3>${escapeSponsorHtml(options.title || "Adjust avatar")}</h3>
                    </div>
                </div>
                <div class="avatar-cropper-body">
                    <div class="avatar-cropper-stage">
                        <canvas class="avatar-cropper-canvas" width="${outputSize}" height="${outputSize}"></canvas>
                        <div class="avatar-cropper-mask"></div>
                    </div>
                    <div class="avatar-cropper-controls">
                        <label class="avatar-cropper-zoom">
                            <span>${escapeSponsorHtml(options.zoomLabel || "Zoom")}</span>
                            <input type="range" min="1" max="4" step="0.01" value="1">
                        </label>
                        <p class="avatar-cropper-hint">${escapeSponsorHtml(options.hint || "Drag the image to choose the visible area.")}</p>
                    </div>
                </div>
                <div class="avatar-cropper-actions">
                    <button type="button" class="ghost-btn avatar-cropper-reset">${escapeSponsorHtml(options.resetLabel || "Reset")}</button>
                    <button type="button" class="ghost-btn avatar-cropper-cancel">${escapeSponsorHtml(options.cancelLabel || "Cancel")}</button>
                    <button type="button" class="primary-btn avatar-cropper-save">${escapeSponsorHtml(options.saveLabel || "Apply")}</button>
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
