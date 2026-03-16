const EDIT_AUTH_KEY = "crowdfunding_auth";
const editProjectId = new URLSearchParams(window.location.search).get("id");

const editForm = document.getElementById("project-form");
const editStatusNode = document.getElementById("project-status");
const editCategorySelect = document.getElementById("category-select");
const editRejectionNode = document.getElementById("project-rejection-note");

const editAuth = readEditAuth();
if (!editAuth?.accessToken || !editProjectId) {
    window.location.href = "/author-dashboard.html";
}

Promise.all([loadEditCategories(), loadProjectForEdit(editProjectId)])
    .catch((error) => setEditStatus(error.message, "error"));

editForm.addEventListener("submit", async (event) => {
    event.preventDefault();

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

        setEditStatus(`Project updated: ${body.title}`, "success");
        window.setTimeout(() => {
            window.location.href = "/author-dashboard.html";
        }, 500);
    } catch (error) {
        setEditStatus(error.message, "error");
    }
});

async function loadEditCategories() {
    const response = await fetch("/api/categories");
    if (!response.ok) {
        throw new Error("Could not load categories");
    }

    const categories = await response.json();
    editCategorySelect.innerHTML = `<option value="">Without category</option>${categories.map((category) => `
        <option value="${category.id}">${escapeEditHtml(category.title)}</option>
    `).join("")}`;
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
    if (!(project.status === "DRAFT" || project.status === "REJECTED")) {
        throw new Error("This project cannot be edited now");
    }

    if (project.rejectionReason) {
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
