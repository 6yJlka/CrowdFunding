const EDIT_AUTH_KEY = "crowdfunding_auth";
const editProjectId = new URLSearchParams(window.location.search).get("id");

const editForm = document.getElementById("project-form");
const editStatusNode = document.getElementById("project-status");
const editCategorySelect = document.getElementById("category-select");
const editRejectionNode = document.getElementById("project-rejection-note");
const editStartAtInput = editForm.elements.startAt;
const editEndAtInput = editForm.elements.endAt;
const editProjectImageInput = document.getElementById("project-image-input");
const editProjectImageName = document.getElementById("project-image-name");
const editProjectCoverPreviewImage = document.getElementById("project-cover-preview-image");
const editProjectCoverPreviewFallback = document.getElementById("project-cover-preview-fallback");
const editorUI = window.RiseUpEditor(editForm, editCategorySelect);
const editSubmitButton = editForm.querySelector(".primary-btn");
let editorStatus = {message: "", type: ""};
let editProjectImageObjectUrl = "";
let editProjectCroppedImageFile = null;
let hasStoredEditProjectImage = false;
let editCoverOnlyMode = false;

const editAuth = readEditAuth();
if (!editAuth?.accessToken || !editProjectId) {
    window.location.href = "/author-dashboard.html";
}

applyEditDateConstraints();
wireEditProjectPreview();
syncEditProjectImageName();
loadEditCategories().then(() => loadProjectForEdit(editProjectId))
    .catch((error) => setEditStatus(error.message, "error"));
document.addEventListener("app:lang-changed", () => {
    const previousStatus = {...editorStatus};
    applyEditProjectMode(!editCoverOnlyMode, false);
    editorStatus = previousStatus;
    if (!editProjectImageInput.files?.[0] && !editProjectCoverPreviewImage.getAttribute("src")) {
        renderEditProjectCoverFallback();
    }
    syncEditProjectImageName(editProjectCroppedImageFile?.name || editProjectImageInput.files?.[0]?.name);
});

editForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (editCoverOnlyMode) {
        const file = editProjectImageInput.files?.[0];
        if (!file || !editProjectCroppedImageFile) {
            setEditStatus("edit.coverOnly.requireImage", "error");
            return;
        }

        setEditStatus("edit.coverOnly.saving", "info");
        try {
            await uploadEditProjectImage(editProjectId, editProjectCroppedImageFile);
            setEditStatus("edit.coverOnly.saved", "success");
            window.setTimeout(() => {
                window.location.href = "/author-dashboard.html";
            }, 500);
        } catch (error) {
            setEditStatus(error.message, "error");
        }
        return;
    }

    const payload = collectProjectPayload(editForm);
    setEditStatus("editor.saving", "info");

    try {
        const response = await window.RiseUpSession.request(`/api/projects/${editProjectId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${editAuth.tokenType || "Bearer"} ${editAuth.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || editTranslate("editor.saveError"));
        }

        if (editProjectCroppedImageFile) {
            await uploadEditProjectImage(editProjectId, editProjectCroppedImageFile);
        }

        setEditStatus("editor.saved", "success");
        window.setTimeout(() => {
            window.location.href = "/author-dashboard.html";
        }, 500);
    } catch (error) {
        setEditStatus(error.message, "error");
    }
});

function wireEditProjectPreview() {
    editProjectImageInput.addEventListener("change", handleEditProjectImageChange);
}

async function loadEditCategories() {
    const response = await window.RiseUpSession.request("/api/categories");
    if (!response.ok) {
        throw new Error(editTranslate("catalog.error.categories"));
    }

    const categories = await response.json();
    editorUI.setCategories(categories);
    renderEditProjectCoverFallback();
}

async function loadProjectForEdit(projectId) {
    const response = await window.RiseUpSession.request(`/api/projects/${projectId}`, {
        headers: {
            "Authorization": `${editAuth.tokenType || "Bearer"} ${editAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(editTranslate("editor.loadError"));
    }

    const project = await response.json();
    const canEditContent = project.status === "DRAFT" || project.status === "REJECTED";
    applyEditProjectMode(canEditContent);

    if (canEditContent && project.rejectionReason) {
        editRejectionNode.innerHTML = `<strong data-i18n-key="editor.moderator">${escapeEditHtml(editTranslate("editor.moderator"))}</strong> ${escapeEditHtml(project.rejectionReason)}`;
        editRejectionNode.classList.remove("hidden");
    } else {
        editRejectionNode.innerHTML = "";
        editRejectionNode.classList.add("hidden");
    }

    editForm.title.value = project.title ?? "";
    editForm.shortDescription.value = project.shortDescription ?? "";
    editForm.description.value = project.description ?? "";
    editForm.goalAmount.value = project.goalAmount ?? "";
    editForm.currency.value = project.currency ?? "RUB";
    editForm.categoryId.value = project.categoryId ?? "";
    editForm.startAt.value = toLocalInputValue(project.startAt);
    editForm.endAt.value = toLocalInputValue(project.endAt);
    editorUI.setProject(project);
    syncEditEndDateMin();
    renderEditProjectCoverFallback();
    if (project.hasCoverImage) {
        hasStoredEditProjectImage = true;
        showStoredEditProjectImage(project.id);
        syncEditProjectImageName(editTranslate("edit.image.current", "Current image"));
    } else {
        hasStoredEditProjectImage = false;
        clearEditProjectImagePreview();
        syncEditProjectImageName();
    }
}

async function uploadEditProjectImage(projectId, file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await window.RiseUpSession.request(`/api/projects/${projectId}/image`, {
        method: "POST",
        headers: {
            "Authorization": `${editAuth.tokenType || "Bearer"} ${editAuth.accessToken}`
        },
        body: formData
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || body.error || editTranslate("create.image.uploadError", "Project image could not be uploaded"));
    }
}

function handleEditProjectImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
        editProjectCroppedImageFile = null;
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        event.target.value = "";
        editProjectCroppedImageFile = null;
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        setEditStatus("create.image.tooLarge", "error");
        return;
    }

    if (!file.type.startsWith("image/")) {
        event.target.value = "";
        editProjectCroppedImageFile = null;
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        setEditStatus("create.image.imageOnly", "error");
        return;
    }

    openProjectCoverCropper({
        file,
        kicker: editTranslate("project.crop.kicker", "Project cover"),
        title: editTranslate("project.crop.title", "Adjust visible area"),
        hint: editTranslate("project.crop.hint", "Drag the image and choose which part will be shown on the project cover."),
        zoomLabel: editTranslate("project.crop.zoom", "Zoom"),
        resetLabel: editTranslate("project.crop.reset", "Reset"),
        cancelLabel: editTranslate("project.crop.cancel", "Cancel"),
        saveLabel: editTranslate("project.crop.save", "Apply")
    }).then((croppedBlob) => {
        if (!croppedBlob) {
            event.target.value = "";
            editProjectCroppedImageFile = null;
            clearEditProjectImagePreview();
            renderEditProjectCoverFallback();
            syncEditProjectImageName();
            return;
        }

        editProjectCroppedImageFile = new File([croppedBlob], file.name.replace(/\.[^.]+$/, "") || "project-cover", {type: "image/png"});
        syncEditProjectImageName(file.name);
        showEditProjectImagePreview(URL.createObjectURL(editProjectCroppedImageFile));
    }).catch(() => {
        event.target.value = "";
        editProjectCroppedImageFile = null;
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        setEditStatus("project.crop.error", "error");
    });
}

function showStoredEditProjectImage(projectId) {
    clearEditProjectImagePreview();
    editProjectCoverPreviewImage.src = `/api/projects/${projectId}/image`;
    editProjectCoverPreviewImage.classList.remove("hidden");
    editProjectCoverPreviewFallback.classList.add("hidden");
}

function showEditProjectImagePreview(url) {
    clearEditProjectImagePreview();
    editProjectImageObjectUrl = url;
    editProjectCoverPreviewImage.src = url;
    editProjectCoverPreviewImage.classList.remove("hidden");
    editProjectCoverPreviewFallback.classList.add("hidden");
}

function clearEditProjectImagePreview() {
    if (editProjectImageObjectUrl) {
        URL.revokeObjectURL(editProjectImageObjectUrl);
        editProjectImageObjectUrl = "";
    }
    editProjectCoverPreviewImage.removeAttribute("src");
    editProjectCoverPreviewImage.classList.add("hidden");
    editProjectCoverPreviewFallback.classList.remove("hidden");
}

function renderEditProjectCoverFallback() { editorUI.render(); }

function syncEditProjectImageName(fileName = "") {
    if (fileName) {
        editProjectImageName.textContent = fileName;
        return;
    }
    editProjectImageName.textContent = hasStoredEditProjectImage
        ? editTranslate("edit.image.current", "Current image")
        : editTranslate("create.image.none", "No file selected");
}

function collectProjectPayload(form) {
    return {
        title: form.title.value.trim(),
        shortDescription: form.shortDescription.value.trim(),
        description: form.description.value.trim(),
        goalAmount: Number(form.goalAmount.value),
        currency: form.currency.value.trim().toUpperCase(),
        categoryId: form.categoryId.value ? Number(form.categoryId.value) : null,
        startAt: toOffsetDate(form.startAt.value),
        endAt: toOffsetDate(form.endAt.value)
    };
}

function applyEditProjectMode(canEditContent, notify = true) {
    editCoverOnlyMode = !canEditContent;
    editForm.title.disabled = editCoverOnlyMode;
    editForm.shortDescription.disabled = editCoverOnlyMode;
    editForm.description.disabled = editCoverOnlyMode;
    editForm.goalAmount.disabled = editCoverOnlyMode;
    editForm.currency.disabled = editCoverOnlyMode;
    editForm.categoryId.disabled = editCoverOnlyMode;
    editForm.startAt.disabled = editCoverOnlyMode;
    editForm.endAt.disabled = editCoverOnlyMode;
    editSubmitButton.textContent = editCoverOnlyMode
        ? editTranslate("edit.coverOnly.save", "Save cover")
        : editTranslate("edit.save", "Save changes");
    document.getElementById("editor-content-fields").disabled = editCoverOnlyMode;
    document.getElementById("editor-funding-fields").disabled = editCoverOnlyMode;
    editorUI.render();

    if (editCoverOnlyMode) {
        setEditStatus("edit.coverOnly.info", "info", notify);
    }
}

function applyEditDateConstraints() {
    editStartAtInput.min = toLocalInputValue(new Date());
    syncEditEndDateMin();

    editStartAtInput.addEventListener("input", () => {
        syncEditEndDateMin();
        if (editEndAtInput.value && editStartAtInput.value && editEndAtInput.value <= editStartAtInput.value) {
            editEndAtInput.value = "";
        }
    });
}

function syncEditEndDateMin() {
    editEndAtInput.min = editStartAtInput.value || toLocalInputValue(new Date());
}

function readEditAuth() {
    try {
        return JSON.parse(localStorage.getItem(EDIT_AUTH_KEY) || "null");
    } catch {
        return null;
    }
}

function toOffsetDate(value) {
    return value ? new Date(value).toISOString() : null;
}

function toLocalInputValue(value) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setEditStatus(message, type = "", notify = true) {
    if (window.RiseUpSession.expiring) return;
    editorStatus = {message, type};
    editStatusNode.hidden = true;
    if (notify) window.RiseUpToast.show(message, type);
    editStatusNode.textContent = window.AppI18n.t(message);
    editStatusNode.setAttribute("role", type === "error" ? "alert" : "status");
    editStatusNode.className = `auth-status ${type}`.trim();
}

function escapeEditHtml(value) {
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
        const modal = document.createElement("dialog");
        modal.className = "modal-dialog media-crop-dialog";
        modal.setAttribute("aria-label", options.title);
        modal.innerHTML = `
            <div class="avatar-cropper-dialog project-cover-cropper-dialog">
                <div class="avatar-cropper-head">
                    <div>
                        <p class="panel-kicker">${escapeEditHtml(options.kicker || "")}</p>
                        <h3>${escapeEditHtml(options.title || "Adjust cover")}</h3>
                    </div>
                </div>
                <div class="avatar-cropper-body">
                    <div class="avatar-cropper-stage project-cover-cropper-stage">
                        <canvas class="avatar-cropper-canvas" width="${outputWidth}" height="${outputHeight}"></canvas>
                        <div class="project-cover-cropper-mask"></div>
                    </div>
                    <div class="avatar-cropper-controls">
                        <label class="avatar-cropper-zoom">
                            <span>${escapeEditHtml(options.zoomLabel || "Zoom")}</span>
                            <input type="range" min="1" max="4" step="0.01" value="1">
                        </label>
                        <p class="avatar-cropper-hint">${escapeEditHtml(options.hint || "Drag the image and choose the visible area.")}</p>
                    </div>
                </div>
                <div class="avatar-cropper-actions">
                    <button type="button" class="ghost-btn avatar-cropper-reset">${escapeEditHtml(options.resetLabel || "Reset")}</button>
                    <button type="button" class="ghost-btn avatar-cropper-cancel">${escapeEditHtml(options.cancelLabel || "Cancel")}</button>
                    <button type="button" class="primary-btn avatar-cropper-save">${escapeEditHtml(options.saveLabel || "Apply")}</button>
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
function editTranslate(key, fallback) {
    return window.AppI18n?.t?.(key) ?? fallback;
}
