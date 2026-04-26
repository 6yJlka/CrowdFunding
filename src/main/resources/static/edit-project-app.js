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
const editProjectCoverPreviewTitle = document.getElementById("project-cover-preview-title");
const editProjectCoverPreviewCategory = document.getElementById("project-cover-preview-category");
const editSubmitButton = editForm.querySelector(".primary-btn");
let editProjectImageObjectUrl = "";
let hasStoredEditProjectImage = false;
let editCoverOnlyMode = false;

const editAuth = readEditAuth();
if (!editAuth?.accessToken || !editProjectId) {
    window.location.href = "/author-dashboard.html";
}

applyEditDateConstraints();
wireEditProjectPreview();
syncEditProjectImageName();
Promise.all([loadEditCategories(), loadProjectForEdit(editProjectId)])
    .catch((error) => setEditStatus(error.message, "error"));
document.addEventListener("app:lang-changed", () => {
    applyEditProjectMode(!editCoverOnlyMode);
    if (!editProjectImageInput.files?.[0] && !editProjectCoverPreviewImage.getAttribute("src")) {
        renderEditProjectCoverFallback();
    }
    syncEditProjectImageName(editProjectImageInput.files?.[0]?.name);
});

editForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (editCoverOnlyMode) {
        const file = editProjectImageInput.files?.[0];
        if (!file) {
            setEditStatus(editTranslate("edit.coverOnly.requireImage", "Choose a new image to update the cover"), "error");
            return;
        }

        setEditStatus(editTranslate("edit.coverOnly.saving", "Saving cover..."), "info");
        try {
            await uploadEditProjectImage(editProjectId, file);
            setEditStatus(editTranslate("edit.coverOnly.saved", "Project cover updated"), "success");
            window.setTimeout(() => {
                window.location.href = "/author-dashboard.html";
            }, 500);
        } catch (error) {
            setEditStatus(error.message, "error");
        }
        return;
    }

    const payload = collectProjectPayload(editForm);
    setEditStatus("Saving changes...", "info");

    try {
        const response = await fetch(`/api/projects/${editProjectId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${editAuth.tokenType || "Bearer"} ${editAuth.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || "Could not update project");
        }

        if (editProjectImageInput.files?.[0]) {
            await uploadEditProjectImage(editProjectId, editProjectImageInput.files[0]);
        }

        setEditStatus(`Project updated: ${body.title}`, "success");
        window.setTimeout(() => {
            window.location.href = "/author-dashboard.html";
        }, 500);
    } catch (error) {
        setEditStatus(error.message, "error");
    }
});

function wireEditProjectPreview() {
    editForm.title.addEventListener("input", renderEditProjectCoverFallback);
    editCategorySelect.addEventListener("change", renderEditProjectCoverFallback);
    editProjectImageInput.addEventListener("change", handleEditProjectImageChange);
}

async function loadEditCategories() {
    const response = await fetch("/api/categories");
    if (!response.ok) {
        throw new Error("Could not load categories");
    }

    const categories = await response.json();
    editCategorySelect.innerHTML = `<option value="">Without category</option>${categories.map((category) => `
        <option value="${category.id}">${escapeEditHtml(translateEditCategoryTitle(category.title))}</option>
    `).join("")}`;
    renderEditProjectCoverFallback();
}

async function loadProjectForEdit(projectId) {
    const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
            "Authorization": `${editAuth.tokenType || "Bearer"} ${editAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not load project");
    }

    const project = await response.json();
    const canEditContent = project.status === "DRAFT" || project.status === "REJECTED";
    applyEditProjectMode(canEditContent);

    if (canEditContent && project.rejectionReason) {
        editRejectionNode.innerHTML = `<strong>Revision note:</strong> ${escapeEditHtml(project.rejectionReason)}`;
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

    const response = await fetch(`/api/projects/${projectId}/image`, {
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
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        event.target.value = "";
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        setEditStatus(editTranslate("create.image.tooLarge", "Project image must be 5 MB or smaller"), "error");
        return;
    }

    if (!file.type.startsWith("image/")) {
        event.target.value = "";
        clearEditProjectImagePreview();
        renderEditProjectCoverFallback();
        syncEditProjectImageName();
        setEditStatus(editTranslate("create.image.imageOnly", "Project image must be an image"), "error");
        return;
    }

    syncEditProjectImageName(file.name);
    showEditProjectImagePreview(URL.createObjectURL(file));
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

function renderEditProjectCoverFallback() {
    if (editProjectImageInput.files?.[0] || editProjectCoverPreviewImage.getAttribute("src")) {
        return;
    }
    const title = editForm.title.value.trim();
    const categoryTitle = editCategorySelect.options[editCategorySelect.selectedIndex]?.textContent?.trim() || "Project";
    editProjectCoverPreviewTitle.textContent = resolveEditProjectCoverInitials(title);
    editProjectCoverPreviewCategory.textContent = categoryTitle;
    editProjectCoverPreviewFallback.className = `project-cover-preview ${resolveEditProjectCoverToneClass(title, categoryTitle)}`;
}

function syncEditProjectImageName(fileName = "") {
    if (fileName) {
        editProjectImageName.textContent = fileName;
        return;
    }
    editProjectImageName.textContent = hasStoredEditProjectImage
        ? editTranslate("edit.image.current", "Current image")
        : editTranslate("create.image.none", "No file selected");
}

function resolveEditProjectCoverInitials(title) {
    const parts = String(title ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "PR";
    }

    return parts.slice(0, 2)
        .map((part) => Array.from(part)[0] ?? "")
        .join("")
        .toUpperCase();
}

function resolveEditProjectCoverToneClass(title, categoryTitle) {
    const source = `${categoryTitle ?? ""}:${title ?? ""}`;
    const tones = ["cover-violet", "cover-sky", "cover-green", "cover-amber", "cover-coral"];
    let hash = 0;

    for (const symbol of source) {
        hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    }

    return tones[hash % tones.length];
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

function applyEditProjectMode(canEditContent) {
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

    if (editCoverOnlyMode) {
        setEditStatus(editTranslate("edit.coverOnly.info", "For published projects, only the cover image can be changed here"), "info");
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

function setEditStatus(message, type = "") {
    editStatusNode.textContent = message;
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
function translateEditCategoryTitle(title) {
    const normalized = String(title ?? "").trim().toLowerCase();
    const key = EDIT_CATEGORY_TRANSLATION_KEYS[normalized];
    return key ? editTranslate(key, title) : title;
}
function editTranslate(key, fallback) {
    return window.AppI18n?.t?.(key) ?? fallback;
}
const EDIT_CATEGORY_TRANSLATION_KEYS = {
    "??????????": "category.tech",
    "technology": "category.tech",
    "technologies": "category.tech",
    "??????????": "category.art",
    "art": "category.art",
    "?????????? ???????": "category.social",
    "social": "category.social",
    "social projects": "category.social",
    "???????????": "category.education",
    "education": "category.education",
    "???????????????????": "category.charity",
    "charity": "category.charity"
};
