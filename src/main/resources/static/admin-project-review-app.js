const moderationProjectId = new URLSearchParams(location.search).get("id");
const moderationState = {project: null, stats: null, updates: [], comments: [], categories: [], reason: "", busy: false};
const moderationRoot = document.getElementById("moderation-project-detail");
if (!readShellAuth()?.accessToken) location.href = "/auth.html";
else bootstrapModerationReview().catch((error) => {
    if (window.RiseUpSession.expiring) return;
    moderationRoot.setAttribute("aria-busy", "false");
    moderationRoot.innerHTML = `<div class="empty-state">${window.RiseUpProjects.escapeHtml(window.AppI18n.t("app.unavailable"))}</div>`;
    window.RiseUpToast.show(error.message, "error");
});
document.addEventListener("app:lang-changed", renderModerationView);

async function bootstrapModerationReview() {
    if (!moderationProjectId) throw new Error("project.error.missingId");
    const me = await window.RiseUpSession.request("/api/auth/me");
    if (window.RiseUpSession.expiring) return;
    const user = me.ok ? await me.json() : null;
    const roles = Array.isArray(user?.roles) ? user.roles.map((role) => String(role).replace("ROLE_", "")) : [];
    if (!roles.includes("ADMIN")) { location.href = "/"; return; }
    await loadModerationProject();
}
async function loadModerationProject() {
    moderationRoot.setAttribute("aria-busy", "true");
    const [project, stats, updates, comments, categories] = await Promise.all([
        window.RiseUpSession.request(`/api/projects/${moderationProjectId}`),
        window.RiseUpSession.request(`/api/projects/${moderationProjectId}/statistics`),
        window.RiseUpSession.request(`/api/projects/${moderationProjectId}/updates`),
        window.RiseUpSession.request(`/api/projects/${moderationProjectId}/comments`),
        window.RiseUpSession.request("/api/categories")
    ]);
    if (!project.ok) throw new Error("project.error.notFound");
    moderationState.project = await project.json();
    moderationState.stats = stats.ok ? await stats.json() : null;
    moderationState.updates = updates.ok ? await updates.json() : [];
    moderationState.comments = comments.ok ? await comments.json() : [];
    moderationState.categories = categories.ok ? await categories.json() : [];
    renderModerationView();
}
function renderModerationView() {
    if (!moderationState.project) return;
    const focused = document.activeElement?.matches("[data-rejection-reason]");
    moderationRoot.innerHTML = window.RiseUpModeration.markup(moderationState.project, moderationState.categories, "moderation", moderationState.reason);
    window.RiseUpModeration.wireReason(moderationRoot, (value) => { moderationState.reason = value; });
    window.RiseUpModeration.busy(moderationRoot, moderationState.busy, moderationState.project.status);
    if (focused) moderationRoot.querySelector("[data-rejection-reason]").focus({preventScroll: true});
}
moderationRoot.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-moderation-action]");
    if (!button || moderationState.busy || moderationState.project?.status !== "MODERATION") return;
    const action = button.dataset.moderationAction;
    const reason = action === "reject" ? window.RiseUpModeration.validateReason(moderationRoot) : null;
    if (action === "reject" && reason === null) return;
    moderationState.busy = true;
    window.RiseUpModeration.busy(moderationRoot, true);
    try {
        const response = await window.RiseUpSession.request(`/api/admin/projects/${moderationProjectId}/${action}`, {
            method: "POST", headers: {"Content-Type": "application/json"},
            ...(action === "reject" ? {body: JSON.stringify({reason})} : {})
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.message || body.error || "admin.action.error");
        }
        window.RiseUpToast.show(action === "approve" ? "admin.action.approved" : "admin.action.rejected", "success");
        await loadModerationProject();
    } catch (error) { window.RiseUpToast.show(error.message, "error"); }
    finally { moderationState.busy = false; renderModerationView(); }
});
