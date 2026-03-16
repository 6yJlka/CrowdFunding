const adminAuth = readAdminAuth();
const adminProjectsNode = document.getElementById("admin-projects");
const adminStatusNode = document.getElementById("admin-status");
const adminUsersNode = document.getElementById("admin-users");
const adminUsersStatusNode = document.getElementById("admin-users-status");
const adminUsersSearchNode = document.getElementById("admin-users-search");
const adminUsersStatusFilterNode = document.getElementById("admin-users-status-filter");

const moderationState = {page: 0, size: 4, totalPages: 0};
const userState = {page: 0, size: 4, totalPages: 0, query: "", status: ""};

if (!adminAuth?.accessToken) {
    window.location.href = "/auth.html";
}

wireAdminPagination();
loadModerationQueue().catch((error) => setAdminStatus(error.message, "error"));
loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));

async function loadModerationQueue() {
    const url = new URL("/api/admin/projects", window.location.origin);
    url.searchParams.set("status", "MODERATION");
    url.searchParams.set("size", `${moderationState.size}`);
    url.searchParams.set("page", `${moderationState.page}`);
    url.searchParams.append("sort", "createdAt,desc");
    url.searchParams.append("sort", "id,desc");

    const response = await fetch(url, {
        headers: {
            "Authorization": `${adminAuth.tokenType || "Bearer"} ${adminAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not load moderation queue");
    }

    const payload = await response.json();
    moderationState.totalPages = payload.totalPages ?? 0;
    renderModerationQueue(payload.content ?? []);
    updatePagination("projects", moderationState);
}

function renderModerationQueue(projects) {
    if (!projects.length) {
        adminProjectsNode.innerHTML = `<div class="empty-state">Moderation queue is empty.</div>`;
        return;
    }

    adminProjectsNode.innerHTML = projects.map((project) => `
        <article class="project-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeAdminHtml(project.status ?? "MODERATION")}</span>
                <span class="meta-pill">${escapeAdminHtml(project.categoryTitle ?? "General")}</span>
            </div>
            <h4>${escapeAdminHtml(project.title)}</h4>
            <p>${escapeAdminHtml(project.shortDescription ?? "")}</p>
            <div class="form-actions">
                <button class="ghost-btn" type="button" data-admin-action="approve" data-project-id="${project.id}">Approve</button>
                <button class="ghost-btn" type="button" data-admin-action="reject" data-project-id="${project.id}">Reject</button>
                <a class="ghost-btn" href="/project.html?id=${project.id}">Open</a>
            </div>
        </article>
    `).join("");
}

adminProjectsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) {
        return;
    }

    const action = button.getAttribute("data-admin-action");
    const projectId = button.getAttribute("data-project-id");
    let rejectPayload = null;

    if (action === "reject") {
        const reason = window.prompt("Why are you rejecting this project?")?.trim();
        if (!reason) {
            setAdminStatus("Reject reason is required", "error");
            return;
        }
        rejectPayload = JSON.stringify({reason});
    }

    const response = await fetch(
        action === "approve" ? `/api/admin/projects/${projectId}/approve` : `/api/admin/projects/${projectId}/reject`,
        {
            method: "POST",
            headers: {
                "Authorization": `${adminAuth.tokenType || "Bearer"} ${adminAuth.accessToken}`,
                "Content-Type": "application/json"
            },
            body: rejectPayload
        }
    );

    if (!response.ok) {
        setAdminStatus(`Could not ${action} project`, "error");
        return;
    }

    setAdminStatus(`Project ${action}d`, "success");
    await loadModerationQueue();
});

async function loadUsers() {
    const url = new URL("/api/admin/users", window.location.origin);
    url.searchParams.set("size", `${userState.size}`);
    url.searchParams.set("page", `${userState.page}`);
    url.searchParams.set("sort", "createdAt,desc");
    if (userState.query) {
        url.searchParams.set("q", userState.query);
    }
    if (userState.status) {
        url.searchParams.set("status", userState.status);
    }

    const response = await fetch(url, {
        headers: {
            "Authorization": `${adminAuth.tokenType || "Bearer"} ${adminAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not load users");
    }

    const payload = await response.json();
    userState.totalPages = payload.totalPages ?? 0;
    renderUsers(payload.content ?? []);
    updatePagination("users", userState);
}

function renderUsers(users) {
    if (!users.length) {
        adminUsersNode.innerHTML = `<div class="empty-state">No users available.</div>`;
        return;
    }

    adminUsersNode.innerHTML = users.map((user) => `
        <article class="project-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeAdminHtml(user.status ?? "ACTIVE")}</span>
                <span class="meta-pill">${escapeAdminHtml(user.role ?? "USER")}</span>
            </div>
            <h4>${escapeAdminHtml(user.displayName ?? user.email ?? "User")}</h4>
            <p>${escapeAdminHtml(user.email ?? "")}</p>
            <div class="admin-user-controls">
                <label>
                    <span>Role</span>
                    <select data-user-role="${user.id}">
                        ${["AUTHOR", "SPONSOR", "ADMIN"].map((role) => `
                            <option value="${role}" ${role === user.role ? "selected" : ""}>${role}</option>
                        `).join("")}
                    </select>
                </label>
                <label>
                    <span>Status</span>
                    <select data-user-status="${user.id}">
                        ${["ACTIVE", "BLOCKED", "DELETED"].map((status) => `
                            <option value="${status}" ${status === user.status ? "selected" : ""}>${status}</option>
                        `).join("")}
                    </select>
                </label>
            </div>
            <div class="form-actions">
                <button class="ghost-btn" type="button" data-user-save="${user.id}">Save user</button>
            </div>
        </article>
    `).join("");
}

adminUsersNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-user-save]");
    if (!button) {
        return;
    }

    const userId = button.getAttribute("data-user-save");
    const role = adminUsersNode.querySelector(`[data-user-role="${userId}"]`)?.value;
    const status = adminUsersNode.querySelector(`[data-user-status="${userId}"]`)?.value;

    const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
            "Authorization": `${adminAuth.tokenType || "Bearer"} ${adminAuth.accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({role, status})
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        setAdminUsersStatus(body.message || body.error || "Could not update user", "error");
        return;
    }

    setAdminUsersStatus(`User ${body.email || userId} updated`, "success");
    await loadUsers();
});

document.getElementById("admin-users-search-btn").addEventListener("click", () => {
    applyUserFilters();
});

adminUsersSearchNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        applyUserFilters();
    }
});

adminUsersStatusFilterNode.addEventListener("change", () => {
    applyUserFilters();
});

function wireAdminPagination() {
    document.getElementById("admin-projects-prev-btn").addEventListener("click", () => {
        if (moderationState.page <= 0) {
            return;
        }
        moderationState.page -= 1;
        loadModerationQueue().catch((error) => setAdminStatus(error.message, "error"));
    });

    document.getElementById("admin-projects-next-btn").addEventListener("click", () => {
        if (moderationState.page >= Math.max(moderationState.totalPages - 1, 0)) {
            return;
        }
        moderationState.page += 1;
        loadModerationQueue().catch((error) => setAdminStatus(error.message, "error"));
    });

    document.getElementById("admin-users-prev-btn").addEventListener("click", () => {
        if (userState.page <= 0) {
            return;
        }
        userState.page -= 1;
        loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));
    });

    document.getElementById("admin-users-next-btn").addEventListener("click", () => {
        if (userState.page >= Math.max(userState.totalPages - 1, 0)) {
            return;
        }
        userState.page += 1;
        loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));
    });
}

function updatePagination(prefix, state) {
    const currentPage = state.page + 1;
    const totalPages = Math.max(state.totalPages, 1);
    document.getElementById(`admin-${prefix}-pagination-copy`).textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById(`admin-${prefix}-prev-btn`).disabled = state.page <= 0;
    document.getElementById(`admin-${prefix}-next-btn`).disabled = state.page >= Math.max(state.totalPages - 1, 0);
}

function applyUserFilters() {
    userState.query = adminUsersSearchNode.value.trim();
    userState.status = adminUsersStatusFilterNode.value;
    userState.page = 0;
    loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));
}

function readAdminAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function setAdminStatus(message, type = "") {
    adminStatusNode.textContent = message;
    adminStatusNode.className = `auth-status ${type}`.trim();
}

function setAdminUsersStatus(message, type = "") {
    adminUsersStatusNode.textContent = message;
    adminUsersStatusNode.className = `auth-status ${type}`.trim();
}

function escapeAdminHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
