const PROJECT_AUTH_KEY = "crowdfunding_auth";

const projectForm = document.getElementById("project-form");
const statusNode = document.getElementById("project-status");
const categorySelect = document.getElementById("category-select");
const startAtInput = projectForm.elements.startAt;
const endAtInput = projectForm.elements.endAt;
const createI18n = window.AppI18n;

const auth = readAuth();
if (!auth?.accessToken) {
    window.location.href = "/auth.html";
}

loadCategories().catch((error) => setStatus(error.message, "error"));
applyCreateDateConstraints();
document.addEventListener("app:lang-changed", () => {
    loadCategories().catch((error) => setStatus(error.message, "error"));
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

    setStatus(createT("create.status.creating", "Creating project..."), "info");
    try {
        const response = await fetch("/api/projects", {
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

        setStatus(createT("create.status.created", "Project created: {title}").replace("{title}", body.title ?? ""), "success");
        window.setTimeout(() => {
            window.location.href = "/author-dashboard.html";
        }, 500);
    } catch (error) {
        if (String(error.message).includes("403") || String(error.message).includes("401")) {
            setStatus(createT("create.status.forbidden", "This account cannot create projects. Log in as AUTHOR."), "error");
            return;
        }
        setStatus(error.message, "error");
    }
});

async function loadCategories() {
    const selectedCategoryId = categorySelect.value;
    const response = await fetch("/api/categories");
    if (!response.ok) {
        throw new Error(createT("catalog.error.categories", "Could not load categories"));
    }

    const categories = await response.json();
    categorySelect.innerHTML = `<option value="">${createT("create.field.withoutCategory", "Without category")}</option>${categories.map((category) => `
        <option value="${category.id}">${escapeHtml(category.title)}</option>
    `).join("")}`;
    categorySelect.value = selectedCategoryId;
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

function setStatus(message, type = "") {
    statusNode.textContent = message;
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

function createT(key, fallback) {
    return createI18n?.t(key) ?? fallback;
}
