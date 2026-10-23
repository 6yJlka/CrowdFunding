const adminI18n = window.AppI18n;
const adminT = (key) => adminI18n.t(key);
const escapeAdminHtml = window.RiseUpProjects.escapeHtml;
const moderationState = {page: 0, size: 3, totalPages: 0, totalElements: 0, items: [], loaded: false, busy: false, version: 0};
const userState = {page: 0, size: 4, totalPages: 0, query: "", status: "", items: [], loaded: false, busy: false, version: 0};
const commentState = {page: 0, size: 3, totalPages: 0, query: "", items: [], loaded: false, busy: false, version: 0};
const adminReasons = new Map(), adminUserDrafts = new Map(), adminUsersSaving = new Set();
let adminCategories = [], selectedAdminProjectId = null, adminActionBusy = false;
let adminTab = new URLSearchParams(location.search).get("tab") || "queue";
if (!["queue", "users", "comments"].includes(adminTab)) adminTab = "queue";

if (!readShellAuth()?.accessToken) location.href = "/auth.html";
else {
    loadModerationQueue(); loadUsers(); loadComments();
    window.RiseUpSession.request("/api/categories").then((r) => r.ok ? r.json() : []).then((items) => { adminCategories = items; renderModerationQueue(); }).catch(() => {});
}
wireAdminTabs();
renderAdminUserFilter();
wireAdminSearch();
for (const [prefix, state, load] of [["projects", moderationState, loadModerationQueue], ["users", userState, loadUsers], ["comments", commentState, loadComments]]) {
    for (const [direction, step] of [["prev", -1], ["next", 1]]) document.getElementById(`admin-${prefix}-${direction}-btn`).addEventListener("click", () => {
        const page = state.page + step;
        if (state.busy || page < 0 || page >= state.totalPages) return;
        state.page = page;
        load();
    });
}
document.addEventListener("app:lang-changed", () => { renderAdminUserFilter(); renderModerationQueue(); renderUsers(); renderComments(); });

async function adminRequest(url, options = {}, fallback = "admin.action.error") {
    const response = await window.RiseUpSession.request(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.error || fallback);
    return body;
}

async function loadAdminPage(state, endpoint, render, prefix, fallback, extra = {}) {
    const version = ++state.version;
    state.busy = true;
    render();
    const url = new URL(endpoint, location.origin);
    url.searchParams.set("size", state.size);
    url.searchParams.set("page", state.page);
    url.searchParams.append("sort", "createdAt,desc");
    if (prefix !== "users") url.searchParams.append("sort", "id,desc");
    if (state.query) url.searchParams.set("q", state.query);
    if (state.status) url.searchParams.set("status", state.status);
    Object.entries(extra).forEach(([key, value]) => url.searchParams.set(key, value));
    try {
        const body = await adminRequest(url, {}, fallback);
        if (version !== state.version) return;
        state.totalPages = Number(body.totalPages ?? 0);
        state.totalElements = Number(body.totalElements ?? 0);
        if (state.page > 0 && state.page >= state.totalPages) {
            state.page = Math.max(0, state.totalPages - 1);
            return await loadAdminPage(state, endpoint, render, prefix, fallback, extra);
        }
        state.items = body.content ?? [];
        state.loaded = true;
        state.failed = false;
    } catch (error) {
        if (version !== state.version) return;
        state.items = [];
        state.loaded = true;
        state.failed = true;
        window.RiseUpToast.show(error.message, "error");
    } finally {
        if (version === state.version) { state.busy = false; render(); }
    }
}
function loadModerationQueue() { return loadAdminPage(moderationState, "/api/admin/projects", renderModerationQueue, "projects", "admin.error.loadQueue", {status: "MODERATION"}); }
function loadUsers() { return loadAdminPage(userState, "/api/admin/users", renderUsers, "users", "admin.error.loadUsers"); }
function loadComments() { return loadAdminPage(commentState, "/api/admin/comments", renderComments, "comments", "admin.error.loadComments"); }

function renderModerationQueue() {
    const state = moderationState;
    const list = document.getElementById("admin-projects");
    list.setAttribute("aria-busy", String(state.busy));
    document.getElementById("admin-queue-count").textContent = state.failed ? adminT("app.unavailable") : adminI18n.plural("moderation.queueCount", state.totalElements);
    if (!state.items.some((project) => String(project.id) === selectedAdminProjectId)) selectedAdminProjectId = state.items[0] ? String(state.items[0].id) : null;
    list.innerHTML = state.items.length ? state.items.map((project) => `<button class="admin-queue-item" type="button" data-select-project="${escapeAdminHtml(project.id)}" aria-pressed="${String(project.id) === selectedAdminProjectId}" ${adminActionBusy ? "disabled" : ""}><span class="admin-queue-thumb" style="--category-color:${window.RiseUpProjects.categoryColor(project, adminCategories)}" aria-hidden="true">${project.hasCoverImage ? `<img src="/api/projects/${encodeURIComponent(project.id)}/image" alt="">` : ""}</span><span><b>${escapeAdminHtml(project.title)}</b><span>${escapeAdminHtml(project.authorDisplayName || adminT("app.unknown"))} · ${escapeAdminHtml(window.RiseUpModeration.date(project.createdAt))}</span></span></button>`).join("") : `<div class="empty-state">${escapeAdminHtml(adminT(state.failed ? "app.unavailable" : state.loaded ? "admin.queue.empty" : "app.loading"))}</div>`;
    const detail = document.getElementById("admin-queue-detail");
    const focusedReason = detail.contains(document.activeElement) && document.activeElement.matches("[data-rejection-reason]");
    const selected = state.items.find((project) => String(project.id) === selectedAdminProjectId);
    detail.hidden = !selected;
    detail.setAttribute("aria-busy", String(state.busy));
    document.getElementById("admin-queue-layout").classList.toggle("is-empty", !selected && state.loaded);
    if (selected) {
        detail.innerHTML = window.RiseUpModeration.markup(selected, adminCategories, "queue", adminReasons.get(selectedAdminProjectId) || "");
        window.RiseUpModeration.wireReason(detail, (value) => adminReasons.set(selectedAdminProjectId, value));
        window.RiseUpModeration.busy(detail, adminActionBusy, selected.status);
        const open = document.createElement("a");
        open.className = "moderation-full-link";
        open.href = `/admin-project-review.html?id=${encodeURIComponent(selected.id)}`;
        open.textContent = adminT("moderation.fullReview");
        detail.querySelector(".moderation-review-body").append(open);
        if (focusedReason) detail.querySelector("[data-rejection-reason]").focus({preventScroll: true});
    } else detail.replaceChildren();
    updatePagination("projects", state);
}
document.getElementById("admin-projects").addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-project]");
    if (!button || adminActionBusy) return;
    selectedAdminProjectId = button.dataset.selectProject;
    renderModerationQueue();
    [...document.querySelectorAll("[data-select-project]")].find((item) => item.dataset.selectProject === selectedAdminProjectId)?.focus({preventScroll: true});
});
document.getElementById("admin-queue-detail").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-moderation-action]");
    if (!button || adminActionBusy) return;
    const root = document.getElementById("admin-queue-detail"), id = selectedAdminProjectId, action = button.dataset.moderationAction;
    const reason = action === "reject" ? window.RiseUpModeration.validateReason(root) : null;
    if (action === "reject" && reason === null) return;
    adminActionBusy = true;
    window.RiseUpModeration.busy(root, true);
    try {
        await adminRequest(`/api/admin/projects/${encodeURIComponent(id)}/${action}`, {method: "POST", headers: {"Content-Type": "application/json"}, body: action === "reject" ? JSON.stringify({reason}) : null});
        adminReasons.delete(id);
        window.RiseUpToast.show(action === "approve" ? "admin.action.approved" : "admin.action.rejected", "success");
        await loadModerationQueue();
    } catch (error) { window.RiseUpToast.show(error.message, "error"); }
    finally { adminActionBusy = false; renderModerationQueue(); }
});

function renderAdminUserFilter() {
    window.RiseUpDropdown.close();
    const root = document.getElementById("admin-user-filter");
    root.innerHTML = window.RiseUpDropdown.markup({id: "admin-users-status-filter", label: adminT("admin.status"), value: userState.status,
        options: [["", "admin.filter.allUsers"], ["ACTIVE", "admin.filter.active"], ["BLOCKED", "admin.filter.blocked"], ["DELETED", "admin.status.deleted"]]});
    window.RiseUpDropdown.wire(root.querySelector(".dropdown"));
}
function adminUserDropdown(user, draft, field) {
    const id = String(user.id), values = field === "role" ? ["AUTHOR", "SPONSOR", "ADMIN"] : ["ACTIVE", "BLOCKED", "DELETED"];
    return window.RiseUpDropdown.markup({id: `user-${field}-${id}`, label: `${adminT(`admin.${field}`)}: ${user.displayName || user.email || adminT("admin.user")}`,
        value: draft[field], disabled: adminUsersSaving.has(id), attribute: `data-user-${field}="${escapeAdminHtml(id)}"`,
        options: values.map((value) => [value, field === "role" ? `shell.role.${value.toLowerCase()}` : `moderation.userStatus.${value}`])});
}
function renderUsers() {
    window.RiseUpDropdown.close();
    const root = document.getElementById("admin-users");
    root.setAttribute("aria-busy", String(userState.busy));
    root.innerHTML = userState.items.length ? userState.items.map((user) => {
        const draft = adminUserDrafts.get(String(user.id)) || user;
        const id = escapeAdminHtml(user.id), name = user.displayName || user.email || adminT("admin.user");
        return `<tr><td><div class="admin-user-identity"><span class="admin-user-avatar" style="--profile-color:${window.RiseUpUI.resolveProfileColor(user.id)}" aria-hidden="true">${escapeAdminHtml(initials(name))}</span><span><b>${escapeAdminHtml(name)}</b><span>${escapeAdminHtml(user.email)}</span></span></div></td><td>${adminUserDropdown(user, draft, "role")}</td><td>${adminUserDropdown(user, draft, "status")}</td><td><button class="secondary-btn" type="button" data-user-save="${id}" ${adminUsersSaving.has(String(user.id)) ? "disabled" : ""}>${escapeAdminHtml(adminT("profile.save"))}</button></td></tr>`;
    }).join("") : `<tr><td colspan="4"><div class="empty-state">${escapeAdminHtml(adminT(userState.failed ? "app.unavailable" : userState.loaded ? "admin.users.empty" : "app.loading"))}</div></td></tr>`;
    root.querySelectorAll(".dropdown").forEach((host) => window.RiseUpDropdown.wire(host));
    updatePagination("users", userState);
}
document.getElementById("admin-users").addEventListener("change", (event) => {
    const id = event.target.dataset.userRole || event.target.dataset.userStatus;
    if (id) adminUserDrafts.set(id, readUserDraft(id));
});
function readUserDraft(id) {
    return {role: document.querySelector(`[data-user-role="${CSS.escape(id)}"]`).value, status: document.querySelector(`[data-user-status="${CSS.escape(id)}"]`).value};
}
document.getElementById("admin-users").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-user-save]");
    if (!button || adminUsersSaving.has(button.dataset.userSave)) return;
    const id = button.dataset.userSave, body = readUserDraft(id);
    adminUsersSaving.add(id); adminUserDrafts.set(id, body); renderUsers();
    try {
        await adminRequest(`/api/admin/users/${encodeURIComponent(id)}`, {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)}, "admin.user.updateError");
        adminUserDrafts.delete(id);
        window.RiseUpToast.show("admin.user.updated", "success");
        await loadUsers();
    } catch (error) { window.RiseUpToast.show(error.message, "error"); }
    finally { adminUsersSaving.delete(id); renderUsers(); }
});

function renderComments() {
    const root = document.getElementById("admin-comments");
    root.setAttribute("aria-busy", String(commentState.busy));
    root.innerHTML = commentState.items.length ? commentState.items.map((comment) => {
        const deleted = comment.deleted || comment.content === "[deleted]";
        return `<article class="moderated-comment"><div><p class="moderated-comment-meta"><b>${escapeAdminHtml(comment.userDisplayName || adminT("app.anonymous"))}</b> · <a href="/project.html?id=${encodeURIComponent(comment.projectId)}">${escapeAdminHtml(comment.projectTitle || adminT("app.project"))}</a> · <time>${escapeAdminHtml(window.RiseUpModeration.date(comment.createdAt))}</time></p><p class="moderated-comment-text ${deleted ? "is-deleted" : ""}">${escapeAdminHtml(deleted ? adminT("project.comment.removed") : comment.content)}</p></div>${deleted ? "" : `<button class="danger-outline-btn" type="button" data-comment-remove="${escapeAdminHtml(comment.id)}">${escapeAdminHtml(adminT("project.comment.delete"))}</button>`}</article>`;
    }).join("") : `<div class="empty-state">${escapeAdminHtml(adminT(commentState.failed ? "app.unavailable" : commentState.loaded ? "admin.comments.empty" : "app.loading"))}</div>`;
    updatePagination("comments", commentState);
}
document.getElementById("admin-comments").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-comment-remove]");
    if (!button || !await window.RiseUpModeration.confirmDelete()) return;
    button.disabled = true;
    try {
        await adminRequest(`/api/comments/${encodeURIComponent(button.dataset.commentRemove)}`, {method: "DELETE"}, "admin.comment.deleteError");
        window.RiseUpToast.show("project.comment.deleted", "success");
        await loadComments();
    } catch (error) { button.disabled = false; window.RiseUpToast.show(error.message, "error"); }
});

function updatePagination(prefix, state) {
    document.getElementById(`admin-${prefix}-pagination-copy`).textContent = adminT("catalog.pageOf").replace("{page}", state.page + 1).replace("{total}", Math.max(1, state.totalPages));
    document.getElementById(`admin-${prefix}-prev-btn`).disabled = state.busy || state.page <= 0;
    document.getElementById(`admin-${prefix}-next-btn`).disabled = state.busy || state.page >= Math.max(0, state.totalPages - 1);
}
function wireAdminTabs() {
    const buttons = [...document.querySelectorAll("[data-admin-tab]")];
    const select = (key) => {
        adminTab = key;
        buttons.forEach((button) => {
            const on = button.dataset.adminTab === key;
            button.setAttribute("aria-selected", String(on)); button.tabIndex = on ? 0 : -1;
            document.getElementById(`admin-panel-${button.dataset.adminTab}`).hidden = !on;
        });
        const url = new URL(location.href); url.searchParams.set("tab", key); history.replaceState(null, "", url);
    };
    buttons.forEach((button, index) => {
        button.addEventListener("click", () => select(button.dataset.adminTab));
        button.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
            buttons[next].click(); buttons[next].focus();
        });
    });
    select(adminTab);
}
function wireAdminSearch() {
    for (const [prefix, state, load] of [["users", userState, loadUsers], ["comments", commentState, loadComments]]) {
        let timer;
        const input = document.getElementById(`admin-${prefix}-search`);
        const apply = () => { clearTimeout(timer); state.query = input.value.trim(); state.page = 0; if (prefix === "users") state.status = document.getElementById("admin-users-status-filter").value; load(); };
        input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(apply, 250); });
        input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); apply(); } });
        document.getElementById(`admin-${prefix}-search-btn`).addEventListener("click", apply);
        if (prefix === "users") document.getElementById("admin-user-filter").addEventListener("change", apply);
    }
}
function initials(value) { return String(value || "").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase(); }
