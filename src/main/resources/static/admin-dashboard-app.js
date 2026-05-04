const adminAuth = readAdminAuth();
const adminProjectsNode = document.getElementById("admin-projects");
const adminStatusNode = document.getElementById("admin-status");
const adminUsersNode = document.getElementById("admin-users");
const adminUsersStatusNode = document.getElementById("admin-users-status");
const adminUsersSearchNode = document.getElementById("admin-users-search");
const adminUsersStatusFilterNode = document.getElementById("admin-users-status-filter");
const adminCommentsNode = document.getElementById("admin-comments");
const adminCommentsStatusNode = document.getElementById("admin-comments-status");
const adminCommentsSearchNode = document.getElementById("admin-comments-search");
const adminI18n = window.AppI18n;

const moderationState = {page: 0, size: 3, totalPages: 0};
const userState = {page: 0, size: 4, totalPages: 0, query: "", status: ""};
const commentState = {page: 0, size: 3, totalPages: 0, query: ""};
document.addEventListener("app:lang-changed", () => {
    loadModerationQueue().catch((error) => setAdminStatus(error.message, "error"));
    loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));
    loadComments().catch((error) => setAdminCommentsStatus(error.message, "error"));
});

if (!adminAuth?.accessToken) {
    window.location.href = "/auth.html";
}

wireAdminPagination();
loadModerationQueue().catch((error) => setAdminStatus(error.message, "error"));
loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));
loadComments().catch((error) => setAdminCommentsStatus(error.message, "error"));

async function loadModerationQueue() {
    const url = new URL("/api/admin/projects", window.location.origin);
    url.searchParams.set("status", "MODERATION");
    url.searchParams.set("size", `${moderationState.size}`);
    url.searchParams.set("page", `${moderationState.page}`);
    url.searchParams.append("sort", "createdAt,desc");
    url.searchParams.append("sort", "id,desc");

    const response = await authAdminFetch(url);
    if (!response.ok) {
        throw new Error(adminT("admin.error.loadQueue", "Could not load moderation queue"));
    }

    const payload = await response.json();
    moderationState.totalPages = payload.totalPages ?? 0;
    renderModerationQueue(payload.content ?? []);
    updatePagination("projects", moderationState);
}

function renderModerationQueue(projects) {
    if (!projects.length) {
        adminProjectsNode.innerHTML = `<div class="empty-state">${adminT("admin.queue.empty", "Moderation queue is empty.")}</div>`;
        return;
    }

    adminProjectsNode.innerHTML = projects.map((project) => `
        <article class="project-card admin-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeAdminHtml(formatAdminProjectStatus(project.status ?? "MODERATION"))}</span>
                <span class="meta-pill">${escapeAdminHtml(project.categoryTitle ?? adminT("app.general", "General"))}</span>
            </div>
            <h4>${escapeAdminHtml(project.title)}</h4>
            <p>${escapeAdminHtml(project.shortDescription ?? "")}</p>
            <div class="form-actions">
                <button class="ghost-btn" type="button" data-admin-action="approve" data-project-id="${project.id}">${adminT("admin.approve", "Approve")}</button>
                <button class="ghost-btn" type="button" data-admin-action="reject" data-project-id="${project.id}">${adminT("admin.reject", "Reject")}</button>
                <a class="ghost-btn" href="/admin-project-review.html?id=${project.id}">${adminT("admin.open", "Open")}</a>
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
        const reason = window.prompt(adminT("admin.reject.prompt", "Why are you rejecting this project?"))?.trim();
        if (!reason) {
            setAdminStatus(adminT("admin.reject.required", "Reject reason is required"), "error");
            return;
        }
        rejectPayload = JSON.stringify({reason});
    }

    const response = await fetch(
        action === "approve" ? `/api/admin/projects/${projectId}/approve` : `/api/admin/projects/${projectId}/reject`,
        {
            method: "POST",
            headers: buildAdminHeaders(true),
            body: rejectPayload
        }
    );

    if (!response.ok) {
        setAdminStatus(adminT("admin.action.error", "Could not process project action"), "error");
        return;
    }

    setAdminStatus(action === "approve" ? adminT("admin.action.approved", "Project approved") : adminT("admin.action.rejected", "Project rejected"), "success");
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

    const response = await authAdminFetch(url);
    if (!response.ok) {
        throw new Error(adminT("admin.error.loadUsers", "Could not load users"));
    }

    const payload = await response.json();
    userState.totalPages = payload.totalPages ?? 0;
    renderUsers(payload.content ?? []);
    updatePagination("users", userState);
}

function renderUsers(users) {
    if (!users.length) {
        adminUsersNode.innerHTML = `<div class="empty-state">${adminT("admin.users.empty", "No users available.")}</div>`;
        return;
    }

    adminUsersNode.innerHTML = users.map((user) => `
        <article class="project-card admin-card admin-user-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeAdminHtml(user.status ?? "ACTIVE")}</span>
                <span class="meta-pill">${escapeAdminHtml(user.role ?? "USER")}</span>
            </div>
            <h4>${escapeAdminHtml(user.displayName ?? user.email ?? adminT("admin.user", "User"))}</h4>
            <p>${escapeAdminHtml(user.email ?? "")}</p>
            <div class="admin-user-controls">
                <label>
                    <span>${adminT("admin.role", "Role")}</span>
                    <select data-user-role="${user.id}">
                        ${["AUTHOR", "SPONSOR", "ADMIN"].map((role) => `
                            <option value="${role}" ${role === user.role ? "selected" : ""}>${role}</option>
                        `).join("")}
                    </select>
                </label>
                <label>
                    <span>${adminT("admin.status", "Status")}</span>
                    <select data-user-status="${user.id}">
                        ${["ACTIVE", "BLOCKED", "DELETED"].map((status) => `
                            <option value="${status}" ${status === user.status ? "selected" : ""}>${status}</option>
                        `).join("")}
                    </select>
                </label>
            </div>
            <div class="form-actions">
                <button class="ghost-btn" type="button" data-user-save="${user.id}">${adminT("admin.user.save", "Save user")}</button>
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
        headers: buildAdminHeaders(true),
        body: JSON.stringify({role, status})
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        setAdminUsersStatus(body.message || body.error || adminT("admin.user.updateError", "Could not update user"), "error");
        return;
    }

    setAdminUsersStatus(adminT("admin.user.updated", "User updated"), "success");
    await loadUsers();
});

async function loadComments() {
    const url = new URL("/api/admin/comments", window.location.origin);
    url.searchParams.set("size", `${commentState.size}`);
    url.searchParams.set("page", `${commentState.page}`);
    url.searchParams.append("sort", "createdAt,desc");
    url.searchParams.append("sort", "id,desc");
    if (commentState.query) {
        url.searchParams.set("q", commentState.query);
    }

    const response = await authAdminFetch(url);
    if (!response.ok) {
        throw new Error(adminT("admin.error.loadComments", "Could not load comments"));
    }

    const payload = await response.json();
    commentState.totalPages = payload.totalPages ?? 0;
    renderComments(payload.content ?? []);
    updatePagination("comments", commentState);
}

function renderComments(comments) {
    if (!comments.length) {
        adminCommentsNode.innerHTML = `<div class="empty-state">${adminT("admin.comments.empty", "No comments found.")}</div>`;
        return;
    }

    adminCommentsNode.innerHTML = comments.map((comment) => `
        <article class="project-card admin-card admin-comment-card">
            <div class="project-card-header">
                <span class="status-badge">VISIBLE</span>
                <span class="meta-pill">${escapeAdminHtml(comment.projectTitle ?? adminT("app.project", "Project"))}</span>
            </div>
            <h4>${escapeAdminHtml(comment.userDisplayName ?? adminT("app.anonymous", "Anonymous"))}</h4>
            <p>${escapeAdminHtml(compactComment(comment.content))}</p>
            <div class="project-meta">
                <span>${formatAdminDateTime(comment.createdAt)}</span>
                <a class="ghost-btn small-btn" href="/project.html?id=${comment.projectId}">${adminT("admin.openProject", "Open project")}</a>
            </div>
            <div class="form-actions">
                <button class="ghost-btn" type="button" data-comment-remove="${comment.id}">${adminT("project.comment.delete", "Delete comment")}</button>
            </div>
        </article>
    `).join("");
}

adminCommentsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-comment-remove]");
    if (!button) {
        return;
    }

    const commentId = button.getAttribute("data-comment-remove");
    if (!commentId || !window.confirm(adminT("project.comment.deleteConfirm", "Delete this comment?"))) {
        return;
    }

    const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: buildAdminHeaders(false)
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setAdminCommentsStatus(body.message || body.error || adminT("admin.comment.deleteError", "Could not delete comment"), "error");
        return;
    }

    setAdminCommentsStatus(adminT("project.comment.deleted", "Comment deleted"), "success");
    await loadComments();
});

document.getElementById("admin-users-search-btn").addEventListener("click", () => {
    applyUserFilters();
});

document.getElementById("admin-comments-search-btn").addEventListener("click", () => {
    applyCommentFilters();
});

const runUserFiltersDebounced = debounce(applyUserFilters, 250);
const runCommentFiltersDebounced = debounce(applyCommentFilters, 250);

adminUsersSearchNode.addEventListener("input", () => {
    runUserFiltersDebounced();
});

adminCommentsSearchNode.addEventListener("input", () => {
    runCommentFiltersDebounced();
});

adminUsersSearchNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        applyUserFilters();
    }
});

adminCommentsSearchNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        applyCommentFilters();
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

    document.getElementById("admin-comments-prev-btn").addEventListener("click", () => {
        if (commentState.page <= 0) {
            return;
        }
        commentState.page -= 1;
        loadComments().catch((error) => setAdminCommentsStatus(error.message, "error"));
    });

    document.getElementById("admin-comments-next-btn").addEventListener("click", () => {
        if (commentState.page >= Math.max(commentState.totalPages - 1, 0)) {
            return;
        }
        commentState.page += 1;
        loadComments().catch((error) => setAdminCommentsStatus(error.message, "error"));
    });
}

function updatePagination(prefix, state) {
    const currentPage = state.page + 1;
    const totalPages = Math.max(state.totalPages, 1);
    document.getElementById(`admin-${prefix}-pagination-copy`).textContent = adminT("catalog.pageOf", "Page {page} of {total}")
        .replace("{page}", `${currentPage}`)
        .replace("{total}", `${totalPages}`);
    document.getElementById(`admin-${prefix}-prev-btn`).disabled = state.page <= 0;
    document.getElementById(`admin-${prefix}-next-btn`).disabled = state.page >= Math.max(state.totalPages - 1, 0);
}

function applyUserFilters() {
    userState.query = adminUsersSearchNode.value.trim();
    userState.status = adminUsersStatusFilterNode.value;
    userState.page = 0;
    loadUsers().catch((error) => setAdminUsersStatus(error.message, "error"));
}

function applyCommentFilters() {
    commentState.query = adminCommentsSearchNode.value.trim();
    commentState.page = 0;
    loadComments().catch((error) => setAdminCommentsStatus(error.message, "error"));
}

function authAdminFetch(url) {
    return fetch(url, {
        headers: buildAdminHeaders(false)
    });
}

function buildAdminHeaders(includeJson) {
    return {
        "Authorization": `${adminAuth.tokenType || "Bearer"} ${adminAuth.accessToken}`,
        ...(includeJson ? {"Content-Type": "application/json"} : {})
    };
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

function setAdminCommentsStatus(message, type = "") {
    adminCommentsStatusNode.textContent = message;
    adminCommentsStatusNode.className = `auth-status ${type}`.trim();
}

function formatAdminDateTime(value) {
    if (!value) {
        return adminT("common.recently", "Recently");
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function compactComment(value) {
    const text = String(value ?? "").trim();
    if (text.length <= 160) {
        return text || adminT("admin.comment.empty", "Empty comment");
    }
    return `${text.slice(0, 157)}...`;
}

function escapeAdminHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function debounce(callback, delayMs) {
    let timeoutId;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delayMs);
    };
}

function adminT(key, fallback) {
    return adminI18n?.t(key) ?? fallback;
}

function formatAdminProjectStatus(status) {
    return adminT(`project.status.${status}`, status || "UNKNOWN");
}
