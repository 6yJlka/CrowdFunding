const authorAuth = readStoredAuth();
const authorProjectsNode = document.getElementById("author-projects");
const authorStatusNode = document.getElementById("author-status");
const authorNameNode = document.getElementById("author-name");
const authorBioInputNode = document.getElementById("author-bio-input");
const authorAvatarInputNode = document.getElementById("author-avatar-input");
const authorAvatarPreviewNode = document.getElementById("author-avatar-preview");
const authorAvatarFallbackNode = document.getElementById("author-avatar-fallback");
const authorDialog = document.getElementById("author-profile-dialog");
let currentAvatarObjectUrl = "";
let currentProfileHasAvatar = false;
let currentAuthorProfile = null;
let currentAuthorProjects = [];
let authorCategories = [];
let authorTab = "all";
let authorPage = 0;
let authorStatus = {message: "", type: ""};
let profileBusy = false;
const authorTabs = {all: null, active: ["ACTIVE"], draft: ["DRAFT", "MODERATION"], rejected: ["REJECTED"], done: ["FUNDED"]};
const t = (key, fallback = key) => window.AppI18n.t(key) === key ? fallback : window.AppI18n.t(key);
const escapeHtml = window.RiseUpProjects.escapeHtml;
const resolveAuthorLocale = () => window.AppI18n.getLang() === "ru" ? "ru-RU" : "en-US";
const formatMoney = window.RiseUpProjects.formatMoney;

if (!authorAuth?.accessToken) window.location.href = "/auth.html";
else initializeAuthorDashboard().catch((error) => setAuthorStatus(error.message, "error"));

document.getElementById("author-bio-edit-btn").addEventListener("click", openBioEditor);
document.getElementById("author-avatar-open").addEventListener("click", openBioEditor);
document.getElementById("author-avatar-upload").addEventListener("click", () => authorAvatarInputNode.click());
authorAvatarInputNode.addEventListener("change", (event) => handleAvatarChange(event).catch(() => setAuthorStatus("author.status.avatarSaveError", "error")));
authorBioInputNode.addEventListener("input", syncBioCounter);
document.getElementById("author-bio-form").addEventListener("submit", saveBio);
document.getElementById("author-prev").addEventListener("click", () => { authorPage--; renderAuthorProjects(); });
document.getElementById("author-next").addEventListener("click", () => { authorPage++; renderAuthorProjects(); });
document.addEventListener("app:lang-changed", () => {
    if (currentAuthorProfile) renderAuthorProfile();
    renderAuthorProjects();
});
authorDialog.addEventListener("cancel", (event) => { if (profileBusy) event.preventDefault(); });

async function initializeAuthorDashboard() {
    setAuthorStatus("author.status.loadingProfile", "info");
    const [profile, projects, categories] = await Promise.all([
        fetchAuthorJson("/api/auth/me"), loadAuthorProjects(), window.RiseUpSession.request("/api/categories").then((r) => r.ok ? r.json() : [])
    ]);
    currentAuthorProfile = profile;
    currentAuthorProjects = projects;
    authorCategories = categories;
    renderAuthorProfile();
    await loadAuthorAvatar(profile.hasAvatar);
    renderAuthorProjects();
    setAuthorStatus("");
}

async function fetchAuthorJson(url, options = {}) {
    const response = await window.RiseUpSession.request(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.error || t("author.status.projectsError"));
    return body;
}

async function loadAuthorProjects() {
    const projects = [];
    let page = 0, pages = 1;
    do {
        const payload = await fetchAuthorJson(`/api/me/projects?size=24&page=${page}`);
        projects.push(...(payload.content ?? []));
        pages = Number(payload.totalPages ?? 1);
    } while (++page < pages);
    return projects;
}

function renderAuthorProfile() {
    const profile = currentAuthorProfile;
    const name = profile.displayName || (profile.email || "").split("@")[0];
    currentProfileHasAvatar = Boolean(profile.hasAvatar);
    const color = window.RiseUpUI.resolveProfileColor(profile.id);
    document.getElementById("author-profile-banner").style.setProperty("--profile-color", color);
    document.getElementById("profile-modal-avatar").style.setProperty("--profile-color", color);
    authorNameNode.textContent = name;
    authorAvatarFallbackNode.textContent = getInitials(name);
    document.getElementById("author-bio").textContent = profile.bio || t("profile.emptyBio");
    const date = window.AppI18n.formatMembershipDate(profile.createdAt);
    document.getElementById("author-membership").textContent = t("author.membership").replace("{date}", date);
    document.getElementById("profile-name").value = name;
    document.getElementById("profile-email").value = profile.email || "";
    syncModalAvatar();
    const successful = currentAuthorProjects.filter((project) => project.status === "FUNDED").length;
    const count = currentAuthorProjects.length;
    const raised = currentAuthorProjects.reduce((sum, project) => sum + Number(project.collectedAmount || 0), 0);
    const currency = currentAuthorProjects.find((project) => project.currency)?.currency || "RUB";
    const metrics = [
        [formatMoney(raised, currency, true), t("auth.stat.raised")],
        [count, window.AppI18n.plural("count.project", count)],
        [successful, window.AppI18n.plural("author.successful", successful)],
        [`${count ? Math.round(successful / count * 100) : 0}%`, t("author.stats.successRate")]
    ];
    document.getElementById("author-stats").innerHTML = metrics.map(([value, label]) => `<div><dd>${escapeHtml(value)}</dd><dt>${escapeHtml(label)}</dt></div>`).join("");
}

function openBioEditor() {
    if (!currentAuthorProfile) return;
    authorBioInputNode.value = currentAuthorProfile.bio || "";
    syncBioCounter();
    document.getElementById("profile-status").textContent = "";
    syncModalAvatar();
    window.RiseUpUI.openModal(authorDialog);
}

function syncBioCounter() {
    document.getElementById("author-bio-counter").textContent = `${authorBioInputNode.value.length} / 280`;
}

async function saveBio(event) {
    event.preventDefault();
    const bio = authorBioInputNode.value.trim();
    if (!bio || profileBusy) { if (!bio) setAuthorStatus("author.status.bioRequired", "error"); return; }
    profileBusy = true;
    document.getElementById("author-bio-save-btn").disabled = true;
    setAuthorStatus("author.status.bioSaving", "info");
    try {
        currentAuthorProfile = await window.RiseUpProfile.saveBio(bio);
        renderAuthorProfile();
        await loadAuthorAvatar(currentProfileHasAvatar);
        authorDialog.close();
        setAuthorStatus("author.status.bioSaved", "success");
    } catch {
        setAuthorStatus("author.status.bioSaveError", "error");
    } finally {
        profileBusy = false;
        document.getElementById("author-bio-save-btn").disabled = false;
    }
}

function renderAuthorProjects() {
    const tabs = document.getElementById("author-status-tabs");
    tabs.innerHTML = Object.keys(authorTabs).map((key) => `<button type="button" role="tab" id="author-tab-${key}" aria-controls="author-projects" aria-selected="${authorTab === key}" tabindex="${authorTab === key ? 0 : -1}" data-author-tab="${key}">${escapeHtml(t(`author.tab.${key}`))}</button>`).join("");
    tabs.querySelectorAll("button").forEach((button, index, buttons) => {
        button.addEventListener("click", () => { authorTab = button.dataset.authorTab; authorPage = 0; renderAuthorProjects(); document.getElementById(`author-tab-${authorTab}`).focus(); });
        button.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next].click();
        });
    });
    authorProjectsNode.setAttribute("aria-labelledby", `author-tab-${authorTab}`);
    document.getElementById("author-filter-hint").textContent = t(`author.hint.${authorTab}`);
    const filtered = currentAuthorProjects.filter((project) => !authorTabs[authorTab] || authorTabs[authorTab].includes(project.status));
    const pages = Math.max(1, Math.ceil(filtered.length / 4));
    authorPage = Math.max(0, Math.min(authorPage, pages - 1));
    authorProjectsNode.innerHTML = filtered.length ? filtered.slice(authorPage * 4, authorPage * 4 + 4).map(renderAuthorCard).join("") : `<div class="empty-state">${escapeHtml(t(currentAuthorProjects.length ? "author.emptyFilter" : "author.projects.empty"))}</div>`;
    authorProjectsNode.setAttribute("aria-busy", "false");
    document.getElementById("author-page-info").textContent = t("catalog.pageOf").replace("{current}", authorPage + 1).replace("{total}", pages).replace("{page}", authorPage + 1);
    document.getElementById("author-prev").disabled = authorPage === 0;
    document.getElementById("author-next").disabled = authorPage >= pages - 1;
}

function renderAuthorCard(project) {
    const id = encodeURIComponent(project.id);
    const editable = ["DRAFT", "REJECTED"].includes(project.status);
    const live = ["ACTIVE", "FUNDED"].includes(project.status);
    const progress = window.RiseUpProjects.progress(project);
    const cover = project.hasCoverImage ? `<img src="/api/projects/${id}/image" alt="" loading="lazy">` : "";
    const updated = project.updatedAt || project.createdAt;
    const date = updated ? new Intl.DateTimeFormat(resolveAuthorLocale(), {day: "numeric", month: "short"}).format(new Date(updated)) : "";
    return `<article class="author-campaign-card"><a class="author-campaign-cover" href="/project.html?id=${id}" style="--category-color:${window.RiseUpProjects.categoryColor(project, authorCategories)}" aria-label="${escapeHtml(project.title)}">${cover}<span class="status-badge" data-status="${escapeHtml(project.status)}">${escapeHtml(t(`project.status.${project.status}`))}</span></a><div class="author-campaign-body"><div class="author-campaign-heading"><h3><a href="/project.html?id=${id}">${escapeHtml(project.title)}</a></h3><time>${escapeHtml(date)}</time></div><progress class="progress" max="100" value="${Math.min(progress, 100)}" aria-label="${escapeHtml(t("public.progress"))}"></progress><div class="public-project-totals"><span><b>${escapeHtml(formatMoney(project.collectedAmount, project.currency))}</b> ${escapeHtml(t("public.of"))} ${escapeHtml(formatMoney(project.goalAmount, project.currency))}</span><b>${progress}%</b></div>${project.status === "REJECTED" && project.rejectionReason ? `<p class="project-revision-note">${escapeHtml(t("editor.moderator"))} ${escapeHtml(project.rejectionReason)}</p>` : ""}<div class="author-campaign-actions">${editable ? `<a class="secondary-btn" href="/edit-project.html?id=${id}">${escapeHtml(t("author.project.edit"))}</a><button class="primary-btn" type="button" data-submit-id="${escapeHtml(project.id)}">${escapeHtml(t("author.project.submit"))}</button>` : `<a class="secondary-btn" href="/project.html?id=${id}${live ? "#news" : ""}">${escapeHtml(t(live ? "author.openNews" : "author.project.open"))}</a>`}</div></div></article>`;
}

authorProjectsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-submit-id]");
    if (!button) return;
    button.disabled = true;
    setAuthorStatus("author.status.submitting", "info");
    try {
        await fetchAuthorJson(`/api/me/projects/${encodeURIComponent(button.dataset.submitId)}/submit`, {method: "POST"});
        currentAuthorProjects = await loadAuthorProjects();
        renderAuthorProfile();
        renderAuthorProjects();
        setAuthorStatus("author.status.submitted", "success");
    } catch {
        button.disabled = false;
        setAuthorStatus("author.status.submitError", "error");
    }
});

function setAuthorStatus(message, type = "") {
    if (window.RiseUpSession.expiring) return;
    authorStatus = {message, type};
    if (!message.endsWith("loadingProfile")) window.RiseUpToast.show(message, type);
    for (const node of [authorStatusNode, document.getElementById("profile-status")]) {
        node.hidden = true;
        node.removeAttribute("role");
        node.textContent = t(message, message);
        node.className = `auth-status ${type}`.trim();

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
    } else node.textContent = getInitials(authorNameNode.textContent);
}

async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setAuthorStatus("author.status.avatarTooLarge", "error");
        event.target.value = "";
        return;
    }

    if (!file.type.startsWith("image/")) {
        setAuthorStatus("author.status.avatarImageOnly", "error");
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
    setAuthorStatus("author.status.avatarSaving", "info");

    try {
        await window.RiseUpProfile.uploadAvatar(uploadFile);
    } catch {
        if (!window.RiseUpSession.expiring) {
            await loadAuthorAvatar(currentProfileHasAvatar);
            setAuthorStatus("profile.avatarSaveError", "error");
        }
        event.target.value = "";
        return;
    }

    currentProfileHasAvatar = true;
    currentAuthorProfile.hasAvatar = true;
    await loadAuthorAvatar(true);
    setAuthorStatus("author.status.avatarSaved", "success");
    event.target.value = "";
}

async function loadAuthorAvatar(hasAvatar) {
    if (!hasAvatar) {
        showAvatarFallback(authorNameNode.textContent.trim());
        return;
    }

    const blob = await window.RiseUpProfile.loadAvatar();
    if (!blob) {
        showAvatarFallback(authorNameNode.textContent.trim());
        return;
    }
    setAvatarPreviewUrl(URL.createObjectURL(blob));
}

function showAvatarFallback(displayName) {
    revokeCurrentAvatarUrl();
    authorAvatarPreviewNode.hidden = true;
    authorAvatarFallbackNode.hidden = false;
    syncModalAvatar();
    authorAvatarFallbackNode.textContent = getInitials(displayName);
}

function setAvatarPreviewUrl(url) {
    revokeCurrentAvatarUrl();
    currentAvatarObjectUrl = url;
    authorAvatarPreviewNode.src = url;
    authorAvatarPreviewNode.hidden = false;
    authorAvatarFallbackNode.hidden = true;
    syncModalAvatar();
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
