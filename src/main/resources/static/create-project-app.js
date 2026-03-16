const PROJECT_AUTH_KEY = "crowdfunding_auth";

const projectForm = document.getElementById("project-form");
const statusNode = document.getElementById("project-status");
const categorySelect = document.getElementById("category-select");

const auth = readAuth();
if (!auth?.accessToken) {
    window.location.href = "/auth.html";
}

loadCategories().catch((error) => setStatus(error.message, "error"));

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        title: projectForm.title.value.trim(),
        shortDescription: projectForm.shortDescription.value.trim(),
        description: projectForm.description.value.trim(),
        goalAmount: Number(projectForm.goalAmount.value),
        currency: projectForm.currency.value.trim().toUpperCase(),
        categoryId: projectForm.categoryId.value ? Number(projectForm.categoryId.value) : null,
        startAt: toOffsetDate(projectForm.startAt.value),
        endAt: toOffsetDate(projectForm.endAt.value)
    };

    setStatus("Creating project...", "info");
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
            throw new Error(body.message || body.error || "Could not create project");
        }

        setStatus(`Project created: ${body.title}`, "success");
        window.setTimeout(() => {
            window.location.href = "/author-dashboard.html";
        }, 500);
    } catch (error) {
        if (String(error.message).includes("403") || String(error.message).includes("401")) {
            setStatus("This account cannot create projects. Log in as AUTHOR.", "error");
            return;
        }
        setStatus(error.message, "error");
    }
});

async function loadCategories() {
    const response = await fetch("/api/categories");
    if (!response.ok) {
        throw new Error("Could not load categories");
    }

    const categories = await response.json();
    categorySelect.innerHTML = `<option value="">Without category</option>${categories.map((category) => `
        <option value="${category.id}">${escapeHtml(category.title)}</option>
    `).join("")}`;
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
