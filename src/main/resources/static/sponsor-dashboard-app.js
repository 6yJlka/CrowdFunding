const sponsorAuth = readStoredAuth();
const sponsorDonationsNode = document.getElementById("sponsor-donations");
const sponsorStatusNode = document.getElementById("sponsor-status");
const sponsorNameNode = document.getElementById("sponsor-name");
const sponsorBioInputNode = document.getElementById("sponsor-bio-input");
const sponsorAvatarInputNode = document.getElementById("sponsor-avatar-input");
const sponsorAvatarPreviewNode = document.getElementById("sponsor-avatar-preview");
const sponsorAvatarFallbackNode = document.getElementById("sponsor-avatar-fallback");
const sponsorDialog = document.getElementById("sponsor-profile-dialog");
let currentAvatarObjectUrl = "";
let currentProfileHasAvatar = false;
let currentSponsorProfile = null;
let currentSponsorDonations = [];
let sponsorCategories = [];
let sponsorTab = "all";
const sponsorProjectDetails = new Map();
let sponsorStatus = {message: "", type: ""};
let profileBusy = false;
let sponsorDonationsLoaded = false;
const sponsorTabs = {all: null, ok: ["SUCCEEDED"], pending: ["PENDING"], failed: ["FAILED", "CANCELED"]};
const t = (key, fallback = key) => window.AppI18n.t(key) === key ? fallback : window.AppI18n.t(key);
const escapeHtml = window.RiseUpProjects.escapeHtml;
const resolveSponsorLocale = () => window.AppI18n.getLang() === "ru" ? "ru-RU" : "en-US";
const formatMoney = window.RiseUpProjects.formatMoney;

if (!sponsorAuth?.accessToken) window.location.href = "/auth.html";
else initializeSponsorDashboard().catch((error) => {
    setSponsorStatus(error.message, "error");
    document.getElementById("sponsor-donations-panel").setAttribute("aria-busy", "false");
});

document.getElementById("sponsor-bio-edit-btn").addEventListener("click", openBioEditor);
document.getElementById("sponsor-avatar-open").addEventListener("click", openBioEditor);
document.getElementById("sponsor-avatar-upload").addEventListener("click", () => sponsorAvatarInputNode.click());
sponsorAvatarInputNode.addEventListener("change", (event) => handleAvatarChange(event).catch(() => setSponsorStatus("sponsor.status.avatarSaveError", "error")));
sponsorBioInputNode.addEventListener("input", syncBioCounter);
document.getElementById("sponsor-bio-form").addEventListener("submit", saveBio);
document.addEventListener("app:lang-changed", () => {
    if (currentSponsorProfile) renderSponsorProfile();
    renderSponsorDonations();
    setSponsorStatus(sponsorStatus.message, sponsorStatus.type);
});
sponsorDialog.addEventListener("cancel", (event) => { if (profileBusy) event.preventDefault(); });

async function initializeSponsorDashboard() {
    setSponsorStatus("sponsor.status.loadingProfile", "info");
    const [profile, donations] = await Promise.all([
        fetchSponsorJson("/api/auth/me"), loadSponsorDonations()
    ]);
    currentSponsorProfile = profile;
    currentSponsorDonations = donations;
    sponsorDonationsLoaded = true;
    renderSponsorProfile();
    renderSponsorDonations();
    setSponsorStatus("");
    await Promise.allSettled([loadSponsorAvatar(profile.hasAvatar), loadSponsorProjectPresentation()]);
}

async function fetchSponsorJson(url, options = {}) {
    const response = await fetch(url, {...options, headers: {Authorization: `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`, ...options.headers}});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.error || "sponsor.status.loadError");
    return body;
}

async function loadSponsorDonations() {
    const donations = [];
    let page = 0, pages = 1;
    do {
        const payload = await fetchSponsorJson(`/api/me/donations?size=24&page=${page}`);
        donations.push(...(payload.content ?? []));
        pages = Number(payload.totalPages ?? 1);
    } while (++page < pages);
    return donations;
}

async function loadSponsorProjectPresentation() {
    const ids = [...new Set(currentSponsorDonations.filter((item) => !item.hasProjectCoverImage).map((item) => item.projectId).filter(Boolean))];
    await Promise.allSettled([
        fetch("/api/categories").then((response) => response.ok ? response.json() : []).then((items) => { sponsorCategories = items; }),
        ...ids.map(async (id) => {
            const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
            if (response.ok) sponsorProjectDetails.set(String(id), await response.json());
        })
    ]);
    renderSponsorDonations();
}

function renderSponsorProfile() {
    const profile = currentSponsorProfile;
    const name = profile.displayName || (profile.email || "").split("@")[0];
    currentProfileHasAvatar = Boolean(profile.hasAvatar);
    const color = window.RiseUpUI.resolveProfileColor(profile.id);
    document.getElementById("sponsor-profile-banner").style.setProperty("--profile-color", color);
    document.getElementById("profile-modal-avatar").style.setProperty("--profile-color", color);
    sponsorNameNode.textContent = name;
    sponsorAvatarFallbackNode.textContent = getInitials(name);
    document.getElementById("sponsor-bio").textContent = profile.bio || t("profile.emptyBio");
    const date = window.AppI18n.formatMembershipDate(profile.createdAt);
    document.getElementById("sponsor-membership").textContent = t("sponsor.membership").replace("{date}", date);
    document.getElementById("profile-name").value = name;
    document.getElementById("profile-email").value = profile.email || "";
    syncModalAvatar();
    const successful = currentSponsorDonations.filter((item) => item.status === "SUCCEEDED").length;
    const count = currentSponsorDonations.length;
    const supported = new Set(currentSponsorDonations.map((item) => item.projectId).filter(Boolean)).size;
    const amount = currentSponsorDonations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const metrics = [
        [formatMoney(amount, "RUB", true), t("sponsor.metric.amount")],
        [supported, window.AppI18n.plural("sponsor.metric.projects", supported)],
        [count, window.AppI18n.plural("sponsor.metric.donations", count)],
        [successful, window.AppI18n.plural("sponsor.metric.paid", successful)]
    ];
    document.getElementById("sponsor-stats").innerHTML = metrics.map(([value, label]) => `<div><dd>${escapeHtml(value)}</dd><dt>${escapeHtml(label)}</dt></div>`).join("");
}

function openBioEditor() {
    if (!currentSponsorProfile) return;
    sponsorBioInputNode.value = currentSponsorProfile.bio || "";
    syncBioCounter();
    document.getElementById("profile-status").textContent = "";
    syncModalAvatar();
    window.RiseUpUI.openModal(sponsorDialog);
}

function syncBioCounter() {
    document.getElementById("sponsor-bio-counter").textContent = `${sponsorBioInputNode.value.length} / 280`;
}

async function saveBio(event) {
    event.preventDefault();
    const bio = sponsorBioInputNode.value.trim();
    if (!bio || profileBusy) { if (!bio) setSponsorStatus("sponsor.status.bioRequired", "error"); return; }
    profileBusy = true;
    document.getElementById("sponsor-bio-save-btn").disabled = true;
    setSponsorStatus("sponsor.status.bioSaving", "info");
    try {
        currentSponsorProfile = await fetchSponsorJson("/api/me/profile", {method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({bio})});
        renderSponsorProfile();
        await loadSponsorAvatar(currentProfileHasAvatar);
        sponsorDialog.close();
        setSponsorStatus("sponsor.status.bioSaved", "success");
    } catch {
        setSponsorStatus("sponsor.status.bioSaveError", "error");
    } finally {
        profileBusy = false;
        document.getElementById("sponsor-bio-save-btn").disabled = false;
    }
}

function renderSponsorDonations() {
    if (!sponsorDonationsLoaded) return;
    const tabs = document.getElementById("sponsor-status-tabs");
    const focusedTab = tabs.contains(document.activeElement) ? document.activeElement.dataset.sponsorTab : null;
    tabs.innerHTML = Object.keys(sponsorTabs).map((key) => `<button type="button" role="tab" id="sponsor-tab-${key}" aria-controls="sponsor-donations-panel" aria-selected="${sponsorTab === key}" tabindex="${sponsorTab === key ? 0 : -1}" data-sponsor-tab="${key}">${escapeHtml(t(`sponsor.tab.${key}`))}</button>`).join("");
    tabs.querySelectorAll("button").forEach((button, index, buttons) => {
        button.addEventListener("click", () => { sponsorTab = button.dataset.sponsorTab; renderSponsorDonations(); document.getElementById(`sponsor-tab-${sponsorTab}`).focus(); });
        button.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next].click();
        });
    });
    if (focusedTab !== null) document.getElementById(`sponsor-tab-${focusedTab}`)?.focus({preventScroll: true});
    const panel = document.getElementById("sponsor-donations-panel");
    panel.setAttribute("aria-labelledby", `sponsor-tab-${sponsorTab}`);
    const filtered = currentSponsorDonations.filter((item) => !sponsorTabs[sponsorTab] || sponsorTabs[sponsorTab].includes(item.status));
    sponsorDonationsNode.innerHTML = filtered.map(renderSponsorDonation).join("");
    panel.setAttribute("aria-busy", "false");
    const empty = document.getElementById("sponsor-empty");
    empty.hidden = Boolean(filtered.length);
    empty.dataset.i18nKey = currentSponsorDonations.length ? "sponsor.emptyFilter" : "sponsor.projects.empty";
    empty.textContent = t(empty.dataset.i18nKey);
}

function renderSponsorDonation(item) {
    const projectId = encodeURIComponent(item.projectId);
    const title = item.projectTitle || t("sponsor.project.untitled");
    const dateValue = item.confirmedAt || item.createdAt;
    const date = dateValue ? new Intl.DateTimeFormat(resolveSponsorLocale(), {day: "numeric", month: "long", year: "numeric"}).format(new Date(dateValue)) : "—";
    const project = sponsorProjectDetails.get(String(item.projectId));
    const color = project ? window.RiseUpProjects.categoryColor(project, sponsorCategories) : "#3A3A40";
    const href = `/project.html?id=${projectId}`;
    const pending = item.status === "PENDING";
    return `<li class="sponsor-donation-row"><span class="sponsor-donation-cover" style="--category-color:${color}" aria-hidden="true">${item.hasProjectCoverImage ? `<img src="/api/projects/${projectId}/image" alt="" loading="lazy">` : ""}</span><div class="sponsor-donation-copy"><a href="${href}">${escapeHtml(title)}</a><time>${escapeHtml(date)}</time></div><span class="status-badge" data-status="${escapeHtml(item.status)}">${escapeHtml(t(`donation.status.${item.status}`))}</span><strong class="sponsor-donation-amount">${escapeHtml(formatMoney(item.amount, "RUB"))}</strong><div class="sponsor-donation-action"><a class="${pending ? "primary-btn" : "secondary-btn"}" href="${pending ? `/pay.html?donationId=${encodeURIComponent(item.id)}` : href}">${escapeHtml(t(pending ? "sponsor.finishPayment" : "sponsor.toProject"))}</a></div></li>`;
}

function setSponsorStatus(message, type = "") {
    sponsorStatus = {message, type};
    for (const node of [sponsorStatusNode, document.getElementById("profile-status")]) {
        node.textContent = t(message, message);
        node.className = `auth-status ${type}`.trim();
        node.setAttribute("role", type === "error" ? "alert" : "status");
    }
}

function readStoredAuth() {
    try { return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null"); } catch { return null; }
}

function syncModalAvatar() {
    const node = document.getElementById("profile-modal-avatar");
    node.replaceChildren();
    if (currentAvatarObjectUrl) {
        const image = document.createElement("img");
        image.src = currentAvatarObjectUrl;
        image.alt = "";
        node.append(image);
    } else node.textContent = getInitials(sponsorNameNode.textContent);
}

async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setSponsorStatus("sponsor.status.avatarTooLarge", "error");
        event.target.value = "";
        return;
    }

    if (!file.type.startsWith("image/")) {
        setSponsorStatus("sponsor.status.avatarImageOnly", "error");
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
        event.target.value = "";
        return;
    }

    const uploadFile = new File([croppedAvatar], "avatar.png", {type: "image/png"});

    setAvatarPreviewUrl(URL.createObjectURL(uploadFile));
    setSponsorStatus("sponsor.status.avatarSaving", "info");

    const formData = new FormData();
    formData.append("avatar", uploadFile);

    const response = await fetch("/api/me/avatar", {
        method: "POST",
        headers: {
            "Sponsorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        await loadSponsorAvatar(currentProfileHasAvatar);
        setSponsorStatus("sponsor.status.avatarSaveError", "error");
        event.target.value = "";
        return;
    }

    currentProfileHasAvatar = true;
    currentSponsorProfile.hasAvatar = true;
    await loadSponsorAvatar(true);
    setSponsorStatus("sponsor.status.avatarSaved", "success");
    event.target.value = "";
}

async function loadSponsorAvatar(hasAvatar) {
    if (!hasAvatar) {
        showAvatarFallback(sponsorNameNode.textContent.trim());
        return;
    }

    const response = await fetch("/api/me/avatar", {
        headers: {
            "Sponsorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        showAvatarFallback(sponsorNameNode.textContent.trim());
        return;
    }

    const blob = await response.blob();
    setAvatarPreviewUrl(URL.createObjectURL(blob));
}

function showAvatarFallback(displayName) {
    revokeCurrentAvatarUrl();
    sponsorAvatarPreviewNode.hidden = true;
    sponsorAvatarFallbackNode.hidden = false;
    syncModalAvatar();
    sponsorAvatarFallbackNode.textContent = getInitials(displayName);
}

function setAvatarPreviewUrl(url) {
    revokeCurrentAvatarUrl();
    currentAvatarObjectUrl = url;
    sponsorAvatarPreviewNode.src = url;
    sponsorAvatarPreviewNode.hidden = false;
    sponsorAvatarFallbackNode.hidden = true;
    syncModalAvatar();
}

function revokeCurrentAvatarUrl() {
    if (currentAvatarObjectUrl) {
        URL.revokeObjectURL(currentAvatarObjectUrl);
        currentAvatarObjectUrl = "";
    }
}

function getInitials(value) {
    return String(value || "SP")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "SP";
}

async function openAvatarCropper(options) {
    const image = await loadAvatarCropperImage(options.file);
    return new Promise((resolve) => {
        const outputSize = 512;
        const modal = document.createElement("dialog");
        modal.className = "modal-dialog media-crop-dialog";
        modal.setAttribute("aria-label", options.title);
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
            if (modal.open) modal.close();
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

        modal.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            close(null);
        });
        modal.addEventListener("cancel", (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.setTimeout(() => close(null), 0);
        });
        document.body.appendChild(modal);
        window.RiseUpUI.openModal(modal);
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
