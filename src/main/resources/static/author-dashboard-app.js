const authorAuth = readStoredAuth();
const authorProjectsNode = document.getElementById("author-projects");
const authorStatusNode = document.getElementById("author-status");

if (!authorAuth?.accessToken) {
    window.location.href = "/auth.html";
}

loadAuthorProjects().catch((error) => setAuthorStatus(error.message, "error"));

async function loadAuthorProjects() {
    const response = await fetch("/api/me/projects?size=24", {
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not load author projects");
    }

    const payload = await response.json();
    renderAuthorProjects(payload.content ?? []);
}

function renderAuthorProjects(projects) {
    if (!projects.length) {
        authorProjectsNode.innerHTML = `<div class="empty-state">You do not have any projects yet.</div>`;
        return;
    }

    authorProjectsNode.innerHTML = projects.map((project) => {
        const canEdit = project.status === "DRAFT" || project.status === "REJECTED";
        const canSubmit = canEdit;
        return `
            <article class="project-card">
                <div class="project-card-header">
                    <span class="status-badge">${escapeHtml(project.status)}</span>
                    <span class="meta-pill">${escapeHtml(project.categoryTitle ?? "General")}</span>
                </div>
                <h4>${escapeHtml(project.title)}</h4>
                <p>${escapeHtml(project.shortDescription ?? "")}</p>
                ${project.rejectionReason ? `<div class="project-rejection-note"><strong>Revision note:</strong> ${escapeHtml(project.rejectionReason)}</div>` : ""}
                <div class="project-card-footer">
                    <div class="project-card-footer-actions">
                        <a class="ghost-btn" href="/project.html?id=${project.id}">Open</a>
                        ${canEdit ? `<a class="ghost-btn" href="/edit-project.html?id=${project.id}">Edit</a>` : ""}
                    </div>
                    ${canSubmit ? `<button class="primary-btn small-btn" type="button" data-submit-id="${project.id}">Submit to moderation</button>` : ""}
                </div>
            </article>
        `;
    }).join("");
}

authorProjectsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-submit-id]");
    if (!button) {
        return;
    }

    setAuthorStatus("Submitting project...", "info");
    const response = await fetch(`/api/me/projects/${button.getAttribute("data-submit-id")}/submit`, {
        method: "POST",
        headers: {
            "Authorization": `${authorAuth.tokenType || "Bearer"} ${authorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        setAuthorStatus("Could not submit project to moderation", "error");
        return;
    }

    setAuthorStatus("Project submitted to moderation", "success");
    await loadAuthorProjects();
});

function readStoredAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function setAuthorStatus(message, type = "") {
    authorStatusNode.textContent = message;
    authorStatusNode.className = `auth-status ${type}`.trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
