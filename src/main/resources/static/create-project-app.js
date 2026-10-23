const PROJECT_AUTH_KEY = "crowdfunding_auth";

const projectForm = document.getElementById("project-form");
const statusNode = document.getElementById("project-status");
const categorySelect = document.getElementById("category-select");
const startAtInput = projectForm.elements.startAt;
const endAtInput = projectForm.elements.endAt;
const projectImageInput = document.getElementById("project-image-input");
const projectImageName = document.getElementById("project-image-name");
const projectCoverPreviewImage = document.getElementById("project-cover-preview-image");
const projectCoverPreviewFallback = document.getElementById("project-cover-preview-fallback");
const editorUI = window.RiseUpEditor(projectForm, categorySelect);
const createI18n = window.AppI18n;
let editorStatus = {message: "", type: ""};
let createProjectImageObjectUrl = "";
let createProjectCroppedImageFile = null;

const auth = readAuth();
if (!auth?.accessToken) {
    window.location.href = "/auth.html";
}

loadCategories().catch((error) => setStatus(error.message, "error"));
applyCreateDateConstraints();
applyCreateDateInputLocale();
wireCreateProjectPreview();
syncCreateProjectImageName();
renderCreateProjectCoverFallback();
document.addEventListener("app:lang-changed", () => {
    applyCreateDateInputLocale();
    loadCategories().catch((error) => setStatus(error.message, "error"));
    syncCreateProjectImageName(createProjectCroppedImageFile?.name || projectImageInput.files?.[0]?.name);
    if (!projectImageInput.files?.[0]) {
        renderCreateProjectCoverFallback();
    }
});

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        title: projectForm.title.value.trim(),
        shortDescription: projectForm.shortDescription.value.trim(),
        description: projectForm.description.value.trim(),
        goalAmount: Number(projectForm.goalAmount.value),
        currency: "RUB",
        categoryId: projectForm.categoryId.value ? Number(projectForm.categoryId.value) : null,
        startAt: toOffsetDate(projectForm.startAt.value),
        endAt: toOffsetDate(projectForm.endAt.value)
    };

    setStatus("create.status.creating", "info");
    try {
        const response = await window.RiseUpSession.request("/api/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || createT("create.status.error", "Could not create project"));
        }

        if (createProjectCroppedImageFile) {
            await uploadCreateProjectImage(body.id, createProjectCroppedImageFile);
        }

        setStatus("create.status.created", "success", true, {title: body.title ?? ""});
        window.setTimeout(() => {
            window.location.href = "/author-dashboard.html";
        }, 500);
    } catch (error) {
        if (String(error.message).includes("403") || String(error.message).includes("401")) {
            setStatus("create.status.forbidden", "error");
            return;
        }
        setStatus(error.message, "error");
    }
});

function wireCreateProjectPreview() {
    projectImageInput.addEventListener("change", handleCreateProjectImageChange);
}

async function loadCategories() {
    const response = await window.RiseUpSession.request("/api/categories");
    if (!response.ok) {
        throw new Error(createT("catalog.error.categories", "Could not load categories"));
    }

    const categories = await response.json();
    editorUI.setCategories(categories);
    renderCreateProjectCoverFallback();
}

async function uploadCreateProjectImage(projectId, file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await window.RiseUpSession.request(`/api/projects/${projectId}/image`, {
        method: "POST",
        headers: {
            "Authorization": `${auth.tokenType || "Bearer"} ${auth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || body.error || createT("create.image.uploadError", "Project image could not be uploaded"));
    }
}

function handleCreateProjectImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        createProjectCroppedImageFile = null;
        clearCreateProjectImagePreview();
        renderCreateProjectCoverFallback();
        syncCreateProjectImageName();
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        event.target.value = "";
        createProjectCroppedImageFile = null;
        clearCreateProjectImagePreview();
        renderCreateProjectCoverFallback();
        syncCreateProjectImageName();
        setStatus("create.image.tooLarge", "error");
        return;
    }

    if (!file.type.startsWith("image/")) {
        event.target.value = "";
        createProjectCroppedImageFile = null;
        clearCreateProjectImagePreview();
        renderCreateProjectCoverFallback();
        syncCreateProjectImageName();
        setStatus("create.image.imageOnly", "error");
        return;
    }

    openProjectCoverCropper({
        file,
        kicker: createT("project.crop.kicker", "Project cover"),
        title: createT("project.crop.title", "Adjust visible area"),
        hint: createT("project.crop.hint", "Drag the image and choose which part will be shown on the project cover."),
        zoomLabel: createT("project.crop.zoom", "Zoom"),
        resetLabel: createT("project.crop.reset", "Reset"),
        cancelLabel: createT("project.crop.cancel", "Cancel"),
        saveLabel: createT("project.crop.save", "Apply")
    }).then((croppedBlob) => {
        if (!croppedBlob) {
            event.target.value = "";
            createProjectCroppedImageFile = null;
            clearCreateProjectImagePreview();
            renderCreateProjectCoverFallback();
            syncCreateProjectImageName();
            return;
        }

        createProjectCroppedImageFile = new File([croppedBlob], file.name.replace(/\.[^.]+$/, "") || "project-cover", {type: "image/png"});
        syncCreateProjectImageName(file.name);
        showCreateProjectImagePreview(URL.createObjectURL(createProjectCroppedImageFile));
    }).catch(() => {
        event.target.value = "";
        createProjectCroppedImageFile = null;
        clearCreateProjectImagePreview();
        renderCreateProjectCoverFallback();
        syncCreateProjectImageName();
        setStatus("project.crop.error", "error");
    });
}

function showCreateProjectImagePreview(url) {
    clearCreateProjectImagePreview();
    createProjectImageObjectUrl = url;
    projectCoverPreviewImage.src = url;
    projectCoverPreviewImage.classList.remove("hidden");
    projectCoverPreviewFallback.classList.add("hidden");
}

function clearCreateProjectImagePreview() {
    if (createProjectImageObjectUrl) {
        URL.revokeObjectURL(createProjectImageObjectUrl);
        createProjectImageObjectUrl = "";
    }
    projectCoverPreviewImage.removeAttribute("src");
    projectCoverPreviewImage.classList.add("hidden");
    projectCoverPreviewFallback.classList.remove("hidden");
}

function renderCreateProjectCoverFallback() { editorUI.render(); }

function syncCreateProjectImageName(fileName = "") {
    projectImageName.textContent = fileName || createT("create.image.none", "No file selected");
}

function applyCreateDateConstraints() {
    const minDateTime = toLocalDateTimeInputValue(new Date());
    startAtInput.min = minDateTime;
    endAtInput.min = startAtInput.value || minDateTime;

    startAtInput.addEventListener("input", () => {
        endAtInput.min = startAtInput.value || minDateTime;
        if (endAtInput.value && startAtInput.value && endAtInput.value <= startAtInput.value) {
            endAtInput.value = "";
        }
    });
}

function applyCreateDateInputLocale() {
    const locale = resolveCreateDateInputLocale();
    startAtInput.setAttribute("lang", locale);
    endAtInput.setAttribute("lang", locale);
}

function readAuth() {
    try {
        return JSON.parse(localStorage.getItem(PROJECT_AUTH_KEY) || "null");
    } catch {
        return null;
    }
}

function toOffsetDate(value) {
    return value ? new Date(value).toISOString() : null;
}

function toLocalDateTimeInputValue(value) {
    const date = new Date(value);
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setStatus(message, type = "", notify = true, params = {}) {
    if (window.RiseUpSession.expiring) return;
    editorStatus = {message, type, params};
    statusNode.hidden = true;
    if (notify) window.RiseUpToast.show(message, type, params);
    statusNode.textContent = window.AppI18n.t(message);
    statusNode.setAttribute("role", type === "error" ? "alert" : "status");
    statusNode.className = `auth-status ${type}`.trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function openProjectCoverCropper(options) {
    const image = await loadProjectCropperImage(options.file);
    return new Promise((resolve) => {
        const outputWidth = 1600;
        const outputHeight = 900;
        const aspectRatio = outputWidth / outputHeight;
        const modal = document.createElement("dialog");
        modal.className = "modal-dialog media-crop-dialog";
        modal.setAttribute("aria-label", options.title);
        modal.innerHTML = `
            <div class="avatar-cropper-dialog project-cover-cropper-dialog">
                <div class="avatar-cropper-head">
                    <div>
                        <p class="panel-kicker">${escapeHtml(options.kicker || "")}</p>
                        <h3>${escapeHtml(options.title || "Adjust cover")}</h3>
                    </div>
                </div>
                <div class="avatar-cropper-body">
                    <div class="avatar-cropper-stage project-cover-cropper-stage">
                        <canvas class="avatar-cropper-canvas" width="${outputWidth}" height="${outputHeight}"></canvas>
                        <div class="project-cover-cropper-mask"></div>
                    </div>
                    <div class="avatar-cropper-controls">
                        <label class="avatar-cropper-zoom">
                            <span>${escapeHtml(options.zoomLabel || "Zoom")}</span>
                            <input type="range" min="1" max="4" step="0.01" value="1">
                        </label>
                        <p class="avatar-cropper-hint">${escapeHtml(options.hint || "Drag the image and choose the visible area.")}</p>
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
        const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
        const containScale = Math.min(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
        const minZoom = Math.min(containScale / baseScale, 1);

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
            const limitX = Math.max((scaledWidth - outputWidth) / 2, 0);
            const limitY = Math.max((scaledHeight - outputHeight) / 2, 0);
            offsetX = clamp(offsetX, -limitX, limitX);
            offsetY = clamp(offsetY, -limitY, limitY);
        }

        function render() {
            constrainOffsets();
            const backgroundWidth = image.naturalWidth * baseScale;
            const backgroundHeight = image.naturalHeight * baseScale;
            const backgroundX = (outputWidth - backgroundWidth) / 2;
            const backgroundY = (outputHeight - backgroundHeight) / 2;
            const scaledWidth = image.naturalWidth * baseScale * zoom;
            const scaledHeight = image.naturalHeight * baseScale * zoom;
            const drawX = (outputWidth - scaledWidth) / 2 + offsetX;
            const drawY = (outputHeight - scaledHeight) / 2 + offsetY;
            context.clearRect(0, 0, outputWidth, outputHeight);
            context.filter = "blur(28px) saturate(0.9)";
            context.drawImage(image, backgroundX, backgroundY, backgroundWidth, backgroundHeight);
            context.filter = "none";
            context.fillStyle = "rgba(15, 23, 42, 0.18)";
            context.fillRect(0, 0, outputWidth, outputHeight);
            context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
        }

        function resetView() {
            zoom = 1;
            offsetX = 0;
            offsetY = 0;
            zoomInput.value = "1";
            render();
        }

        function close(result) {
            if (modal.open) modal.close();
            modal.remove();
            document.body.classList.remove("avatar-cropper-open");
            resolve(result);
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
        canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            const nextZoom = clamp(zoom + (event.deltaY < 0 ? 0.12 : -0.12), minZoom, 4);
            zoom = nextZoom;
            zoomInput.value = `${nextZoom}`;
            render();
        }, {passive: false});

        zoomInput.min = `${minZoom}`;
        zoomInput.addEventListener("input", () => {
            zoom = Number(zoomInput.value);
            render();
        });

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

        modal.addEventListener("cancel", (event) => { event.preventDefault(); close(null); });
        document.body.appendChild(modal);
        window.RiseUpUI.openModal(modal);
        document.body.classList.add("avatar-cropper-open");
        modal.querySelector(".project-cover-cropper-stage").style.aspectRatio = `${aspectRatio}`;
        resetView();
    });
}

function loadProjectCropperImage(file) {
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

function createT(key, fallback) {
    return createI18n?.t(key) ?? fallback;
}

function resolveCreateDateInputLocale() {
    return createI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}
