const projectQuery = new URLSearchParams(window.location.search);
const projectId = projectQuery.get("id");
const paymentResult = projectQuery.get("payment");
const projectAuth = readProjectAuth();
const projectI18n = window.AppI18n;
const projectUiStatuses = new Map();
let projectPageErrorKey = "";

// The storefront only pre-fills the amount; authorization and donation submission stay here.
const suggestedDonationAmount = Number(projectQuery.get("amount"));
let selectedQuickAmount = [500, 1000, 3000, 10000].includes(suggestedDonationAmount) ? suggestedDonationAmount : 1000;
let paymentResultDismissed = false;
if (Number.isFinite(suggestedDonationAmount) && suggestedDonationAmount > 0 && suggestedDonationAmount !== selectedQuickAmount) {
    selectedQuickAmount = null;
    document.getElementById("donation-amount").value = formatAmountInput(String(suggestedDonationAmount));
}

const donationForm = document.getElementById("donation-form");
const donationStatusNode = document.getElementById("donation-status");
const donationNoteNode = document.getElementById("donation-note");
const pageStatusNode = document.getElementById("project-page-status");
const updateForm = document.getElementById("update-form");
const updateStatusNode = document.getElementById("update-status");
const updateNoteNode = document.getElementById("update-note");
const reviewForm = document.getElementById("review-form");
const reviewStatusNode = document.getElementById("review-status");
const reviewNoteNode = document.getElementById("review-note");
const commentForm = document.getElementById("comment-form");
const commentReplyCancelButton = document.getElementById("comment-reply-cancel");
const commentStatusNode = document.getElementById("comment-status");
const commentNoteNode = document.getElementById("comment-note");
const commentsNode = document.getElementById("project-comments");

const projectPageState = {
    currentUser: null,
    currentProject: null,
    currentStats: null,
    currentReviews: [],
    currentDonations: [],
    currentUpdates: [],
    currentComments: [],
    replyToCommentId: null,
    categories: [],
    relatedProjects: [],
    relatedLoaded: false,
    relatedError: false,
    donationBusy: false
};
wireProjectInteractions();
document.addEventListener("app:lang-changed", () => {
    refreshProjectUiStatuses();
    if (!projectPageState.currentProject) {
        if (projectPageErrorKey) document.getElementById("project-title").textContent = projectT(projectPageErrorKey);
        return;
    }
    renderProjectPage(
        projectPageState.currentProject,
        projectPageState.currentStats,
        projectPageState.currentReviews,
        projectPageState.currentDonations,
        projectPageState.currentUpdates,
        projectPageState.currentComments
    );
    initializeRoleAwarePanels();
});

if (!projectId) {
    projectPageErrorKey = "project.error.missingId";
    document.getElementById("project-title").textContent = projectT("project.error.missingId", "Project id is missing");
    document.getElementById("project-hero").setAttribute("aria-busy", "false");
} else {
    bootstrapProjectPage().catch(() => {
        projectPageErrorKey = "project.error.notFound";
        document.getElementById("project-title").textContent = projectT("app.unavailable", "Project unavailable");
        document.getElementById("project-hero").setAttribute("aria-busy", "false");
        setPageStatus("project.error.notFound", "error");
    });
}

commentsNode.addEventListener("click", async (event) => {
    const replyButton = event.target.closest("[data-comment-reply]");
    if (replyButton) {
        const commentId = replyButton.getAttribute("data-comment-reply");
        const comment = projectPageState.currentComments.find((item) => item.id === commentId);
        if (comment) {
            setActiveCommentReply(comment);
        }
        return;
    }

    const button = event.target.closest("[data-comment-delete]");
    if (!button) {
        return;
    }

    if (!projectAuth?.accessToken) {
        setCommentStatus("project.comment.loginManage", "error");
        return;
    }

    const commentId = button.getAttribute("data-comment-delete");
    if (!commentId) {
        return;
    }

    const confirmed = await confirmCommentDelete(projectT);
    if (!confirmed) {
        return;
    }

    setCommentStatus("project.comment.deleting", "info");

    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            }
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.message || body.error || "project.comment.deleteError");
        }

        setCommentStatus("project.comment.deleted", "success");
        await refreshComments();
    } catch (error) {
        setCommentStatus(error.message, "error");
    }
});

commentReplyCancelButton?.addEventListener("click", () => {
    clearActiveCommentReply();
});

async function bootstrapProjectPage() {
    await hydrateCurrentUser();
    await loadProjectPage(projectId);
    initializeRoleAwarePanels();
}

async function hydrateCurrentUser() {
    if (!projectAuth?.accessToken) {
        return;
    }

    const response = await fetch("/api/auth/me", {
        headers: {
            "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
        }
    });

    if (!response.ok) {
        return;
    }

    const me = await response.json();
    projectPageState.currentUser = {
        ...me,
        roles: Array.isArray(me.roles) ? me.roles.map((role) => String(role).replace("ROLE_", "")) : []
    };
}

async function loadProjectPage(id) {
    const [projectResponse, statsResponse, reviewsResponse, donationsResponse, updatesResponse, commentsResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/statistics`),
        fetch(`/api/projects/${id}/reviews`),
        fetch(`/api/projects/${id}/donations/public?size=3`),
        fetch(`/api/projects/${id}/updates`),
        fetch(`/api/projects/${id}/comments`),
        fetch("/api/categories").catch(() => null)
    ]);

    if (!projectResponse.ok) {
        throw new Error("project.error.notFound");
    }

    const project = await projectResponse.json();
    projectPageState.currentProject = project;

    const stats = statsResponse.ok ? await statsResponse.json() : null;
    const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];
    const donationsPayload = donationsResponse.ok ? await donationsResponse.json() : {content: []};
    const updates = updatesResponse.ok ? await updatesResponse.json() : [];
    const comments = commentsResponse.ok ? await commentsResponse.json() : [];
    projectPageState.currentStats = stats;
    projectPageState.currentReviews = reviews;
    projectPageState.currentDonations = donationsPayload.content ?? [];
    projectPageState.currentUpdates = updates;
    projectPageState.currentComments = comments;
    projectPageState.categories = categoriesResponse?.ok ? await categoriesResponse.json() : [];

    renderProjectPage(project, stats, reviews, projectPageState.currentDonations, updates, comments);
    loadRelatedProjects(project);
}

function renderProjectPage(project, stats, reviews, donations, updates, comments) {
    const presentation = window.RiseUpProjects;
    const percent = resolveProjectProgress(project, stats);
    const hero = document.getElementById("project-hero");
    hero.style.setProperty("--category-color", presentation.categoryColor(project, projectPageState.categories));
    hero.classList.toggle("project-hero-has-image", Boolean(project.hasCoverImage));
    hero.classList.toggle("project-hero-uncategorized", project.categoryId == null);
    hero.classList.add("is-loaded");
    hero.setAttribute("aria-busy", "false");
    const category = presentation.categoryTitle(project, projectPageState.categories);
    document.getElementById("project-category").textContent = category;
    const categoryLink = document.getElementById("project-category-link");
    categoryLink.textContent = category;
    categoryLink.hidden = false;
    categoryLink.href = projectCategoryHref(project);
    document.getElementById("project-title").textContent = project.title;
    document.title = `${project.title} | RiseUp`;
    document.getElementById("project-short-description").textContent = project.shortDescription ?? "";
    document.getElementById("project-cover-slot").innerHTML = renderProjectPageCover(project);
    document.querySelector("#project-cover-slot img")?.addEventListener("error", () => {
        hero.classList.remove("project-hero-has-image");
        document.getElementById("project-cover-slot").replaceChildren();
    }, {once: true});
    document.getElementById("project-description").textContent = project.description || project.shortDescription || "";
    document.getElementById("project-raised").textContent = formatMoney(stats?.totalAmount ?? project.collectedAmount);
    document.getElementById("project-goal").textContent = projectT("project.raisedOf").replace("{goal}", formatMoney(stats?.goalAmount ?? project.goalAmount));
    document.getElementById("project-progress-value").textContent = `${percent}%`;
    document.getElementById("project-progress-bar").value = Math.min(percent, 100);
    document.getElementById("project-donors").textContent = String(stats?.totalDonors ?? 0);
    const end = project.endAt ? new Date(project.endAt).getTime() : NaN;
    document.getElementById("project-days-metric").hidden = !Number.isFinite(end);
    const expired = Number.isFinite(end) && end <= Date.now();
    const daysLabel = document.querySelector("#project-days-metric dt");
    daysLabel.dataset.i18nKey = expired ? "project.deadlineExpired" : "project.daysLeft";
    daysLabel.textContent = projectT(daysLabel.dataset.i18nKey);
    document.getElementById("project-days").hidden = expired;
    if (Number.isFinite(end) && !expired) document.getElementById("project-days").textContent = String(Math.ceil((end - Date.now()) / 86400000));
    const badge = document.getElementById("project-status");
    badge.dataset.status = project.status;
    badge.textContent = projectT(`project.status.${project.status}`, project.status);
    const dates = [["project.startDate", project.startAt], ["project.endDate", project.endAt]]
        .filter(([, value]) => value && Number.isFinite(new Date(value).getTime()))
        .map(([key, value]) => `<div><dt>${escapeHtml(projectT(key))}</dt><dd>${escapeHtml(new Intl.DateTimeFormat(resolveProjectLocale(), {day: "numeric", month: "long", year: "numeric"}).format(new Date(value)))}</dd></div>`);
    dates.push(`<div><dt>${escapeHtml(projectT("project.currency"))}</dt><dd>${escapeHtml(project.currency || "RUB")}</dd></div>`);
    document.getElementById("project-dates").innerHTML = dates.join("");
    renderProjectAuthor(project);
    renderDonations(donations);
    renderReviews(reviews);
    renderUpdates(updates);
    renderComments(comments);
    renderRelatedProjects();
    syncDonationAmount();
    document.getElementById("project-details").hidden = false;
    document.getElementById("project-related").hidden = false;
}

function renderProjectPageCover(project) {
    return project.hasCoverImage ? `<img src="/api/projects/${encodeURIComponent(project.id)}/image" alt="">` : "";
}

function renderDonations(donations) {
    document.getElementById("project-donations").innerHTML = donations.length
        ? donations.map((donation) => `<article class="project-donation-row"><div><strong>${escapeHtml(donation.sponsorDisplayName || projectT("project.unknownUser"))}</strong><time>${escapeHtml(formatDateTime(donation.confirmedAt || donation.createdAt))}</time></div><b>${escapeHtml(formatMoney(donation.amount))}</b></article>`).join("")
        : `<div class="empty-state">${escapeHtml(projectT("project.noPublicDonations"))}</div>`;
}

function renderReviews(reviews) {
    const currentUserId = projectPageState.currentUser?.id;
    const hasOwnReview = Boolean(currentUserId && reviews.some((review) => review.userId === currentUserId));
    const isProjectAuthor = Boolean(currentUserId && currentUserId === projectPageState.currentProject?.authorId);
    if (currentUserId) {
        reviewForm.classList.toggle("hidden", hasOwnReview || isProjectAuthor);
        reviewNoteNode.textContent = isProjectAuthor ? getProjectReviewAuthorBlockedText()
            : projectT(hasOwnReview ? "project.review.already" : "project.review.rate");
    }
    document.getElementById("project-reviews-count").textContent = ` · ${reviews.length}`;
    const summary = document.getElementById("project-review-summary");
    summary.hidden = !reviews.length;
    if (reviews.length) {
        const average = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length;
        summary.textContent = projectT("project.reviewSummary")
            .replace("{average}", new Intl.NumberFormat(resolveProjectLocale(), {maximumFractionDigits: 1}).format(average))
            .replace("{count}", String(reviews.length));
    }
    document.getElementById("project-reviews").innerHTML = reviews.length
        ? reviews.map((review) => `<article class="project-review-card"><div><strong>${escapeHtml(review.userDisplayName || projectT("project.unknownUser"))}</strong><b>${Number(review.rating || 0)} / 5</b></div><p>${escapeHtml(review.reviewText ?? "")}</p></article>`).join("")
        : `<div class="empty-state">${escapeHtml(projectT("project.review.none"))}</div>`;
}

function renderUpdates(updates) {
    document.getElementById("project-news-count").textContent = ` · ${updates.length}`;
    document.getElementById("project-updates").innerHTML = updates.length
        ? updates.map((update) => `<article class="project-news-card"><time>${escapeHtml(formatDateTime(update.createdAt))}</time><h3>${escapeHtml(update.title ?? projectT("project.update.titleDefault"))}</h3><p>${escapeHtml(update.content ?? "")}</p></article>`).join("")
        : `<div class="empty-state">${escapeHtml(projectT("project.update.none"))}</div>`;
}

function renderComments(comments) {
    document.getElementById("project-comments-count").textContent = ` · ${comments.length}`;
    commentsNode.innerHTML = comments.length ? buildCommentTree(comments).map(renderCommentCard).join("")
        : `<div class="empty-state">${escapeHtml(projectT("project.comment.none"))}</div>`;
}

function buildCommentTree(comments) {
    const nodes = comments.map((comment) => ({...comment, replies: []}));
    const byId = new Map(nodes.map((comment) => [comment.id, comment]));
    const roots = [];

    nodes.forEach((comment) => {
        const parent = comment.parentId ? byId.get(comment.parentId) : null;
        if (parent) {
            parent.replies.push(comment);
            return;
        }
        roots.push(comment);
    });

    return roots;
}

function renderCommentCard(comment) {
    const deleted = isDeletedComment(comment);
    const name = comment.userDisplayName || projectT("project.unknownUser");
    const isAuthor = comment.userId === projectPageState.currentProject?.authorId;
    return `<article class="project-comment${deleted ? " project-comment-deleted" : ""}">
        ${projectAvatar(comment.userId, name)}
        <div class="project-comment-body"><div class="project-comment-heading"><strong>${escapeHtml(name)}</strong>${isAuthor ? `<span class="goal-badge">${escapeHtml(projectT("app.author"))}</span>` : ""}<time>${escapeHtml(formatDateTime(comment.createdAt))}</time></div>
            <p>${deleted ? `<em>${escapeHtml(projectT("project.comment.removed"))}</em>` : escapeHtml(comment.content ?? "")}</p>
            <div class="project-comment-actions">
                ${canReplyToComment(comment) ? `<button class="ghost-btn" type="button" data-comment-reply="${escapeHtml(comment.id)}">${escapeHtml(projectT("project.comment.reply"))}</button>` : ""}
                ${canDeleteComment(comment) ? `<button class="ghost-btn" type="button" data-comment-delete="${escapeHtml(comment.id)}">${escapeHtml(projectT("project.comment.delete"))}</button>` : ""}
            </div>
        </div>
        ${comment.replies?.length ? `<div class="comment-replies">${comment.replies.map(renderCommentCard).join("")}</div>` : ""}
    </article>`;
}

function initializeRoleAwarePanels() {
    renderPaymentResult();

    donationForm.classList.add("hidden");
    reviewForm.classList.add("hidden");
    commentForm.classList.add("hidden");
    updateForm.classList.add("hidden");
    donationForm.onsubmit = null;
    reviewForm.onsubmit = null;
    commentForm.onsubmit = null;
    updateForm.onsubmit = null;

    donationNoteNode.textContent = projectT("project.donation.login", "Log in as sponsor to support this campaign.");
    reviewNoteNode.textContent = projectT("project.review.login", "Log in to leave a review.");
    commentNoteNode.textContent = projectT("project.comment.login", "Log in to join the discussion.");
    updateNoteNode.textContent = projectT("project.update.authorOnly", "Only the project author can publish updates here.");
    updateNoteNode.classList.remove("hidden");

    const user = projectPageState.currentUser;
    const project = projectPageState.currentProject;
    document.getElementById("project-login-link").hidden = Boolean(user) || project?.status !== "ACTIVE";
    if (project && project.status !== "ACTIVE") donationNoteNode.textContent = projectT("project.donation.notActive");
    if (!user || !project) {
        return;
    }

    const isProjectAuthor = user.id === project.authorId;
    const hasOwnReview = hasCurrentUserReview();
    reviewForm.classList.toggle("hidden", hasOwnReview || isProjectAuthor);
    reviewNoteNode.textContent = isProjectAuthor
        ? getProjectReviewAuthorBlockedText()
        : hasOwnReview
        ? projectT("project.review.already", "You have already posted a review for this project.")
        : projectT("project.review.rate", "Rate this project and share feedback.");
    reviewForm.onsubmit = hasOwnReview || isProjectAuthor ? null : submitReviewForm;

    commentForm.classList.remove("hidden");
    commentNoteNode.textContent = projectT("project.comment.invite", "Share feedback or ask a question.");
    commentForm.onsubmit = submitCommentForm;
    syncCommentReplyControls();

    if (user.roles.includes("SPONSOR") && project.status === "ACTIVE") {
        donationForm.classList.remove("hidden");
        donationNoteNode.textContent = projectT("project.donation.sponsorFlow", "You are logged in as sponsor. Donation will open the demo payment page.");
        donationForm.onsubmit = submitDonationForm;
    } else if (user.roles.includes("SPONSOR")) {
        donationNoteNode.textContent = projectT("project.donation.notActive");
    } else if (user.roles.includes("AUTHOR")) {
        donationNoteNode.textContent = projectT("project.donation.authorBlocked", "Authors cannot donate from this account. Use a sponsor account.");
    } else if (user.roles.includes("ADMIN")) {
        donationNoteNode.textContent = projectT("project.donation.adminBlocked", "Admins do not use the donation flow.");
    }

    if (isProjectAuthor && project.status !== "DRAFT") {
        updateForm.classList.remove("hidden");
        updateNoteNode.textContent = projectT("project.update.publishHint", "Publish timeline updates for your backers.");
        updateForm.onsubmit = submitUpdateForm;
    }
}

async function submitDonationForm(event) {
    event.preventDefault();
    if (projectPageState.donationBusy || projectPageState.currentProject?.status !== "ACTIVE") return;

    const amountValue = resolveDonationAmount();
    if (!amountValue || amountValue <= 0) {
        setDonationStatus("project.donation.invalidAmount", "error");
        return;
    }

    setDonationStatus("project.donation.creating", "info");
    projectPageState.donationBusy = true;
    syncDonationAmount();

    try {
        const response = await fetch("/api/donations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            },
            body: JSON.stringify({
                projectId,
                amount: amountValue
            })
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || "project.donation.createError");
        }

        setDonationStatus("project.donation.redirecting", "success");
        window.setTimeout(() => {
            window.location.href = body.paymentUrl;
        }, 500);
    } catch (error) {
        projectPageState.donationBusy = false;
        syncDonationAmount();
        setDonationStatus(error.message, "error");
    }
}

async function submitCommentForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const content = form.content.value.trim();
    const parentId = projectPageState.replyToCommentId;
    if (!content) {
        setCommentStatus("project.comment.empty", "error");
        return;
    }

    setCommentStatus("project.comment.posting", "info");

    try {
        const response = await fetch(`/api/projects/${projectId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            },
            body: JSON.stringify(parentId ? {content, parentId} : {content})
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || "project.comment.postError");
        }

        form.reset();
        clearActiveCommentReply();
        setCommentStatus("project.comment.posted", "success");
        await refreshComments();
    } catch (error) {
        setCommentStatus(error.message, "error");
    }
}

async function submitReviewForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const payload = {
        rating: Number(form.rating.value),
        reviewText: form.reviewText.value.trim()
    };

    if (!payload.rating || payload.rating < 1 || payload.rating > 5 || !payload.reviewText) {
        setReviewStatus("project.review.invalid", "error");
        return;
    }

    setReviewStatus("project.review.posting", "info");

    try {
        const response = await fetch(`/api/projects/${projectId}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || "project.review.postError");
        }

        form.reset();
        form.rating.value = "5";
        setReviewStatus("project.review.posted", "success");
        await refreshReviews();
    } catch (error) {
        setReviewStatus(error.message, "error");
    }
}

async function submitUpdateForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const payload = {
        title: form.title.value.trim(),
        content: form.content.value.trim()
    };

    if (!payload.title || !payload.content) {
        setUpdateStatus("project.update.invalid", "error");
        return;
    }

    setUpdateStatus("project.update.publishing", "info");

    try {
        const response = await fetch(`/api/projects/${projectId}/updates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || "project.update.publishError");
        }

        form.reset();
        setUpdateStatus("project.update.published", "success");
        await refreshUpdates();
    } catch (error) {
        setUpdateStatus(error.message, "error");
    }
}

async function refreshComments() {
    const response = await fetch(`/api/projects/${projectId}/comments`);
    if (!response.ok) {
        return;
    }
    const comments = await response.json();
    projectPageState.currentComments = comments;
    renderComments(comments);
}

async function refreshReviews() {
    const response = await fetch(`/api/projects/${projectId}/reviews`);
    if (!response.ok) {
        return;
    }
    const reviews = await response.json();
    projectPageState.currentReviews = reviews;
    renderReviews(reviews);
    initializeRoleAwarePanels();
}

async function refreshUpdates() {
    const response = await fetch(`/api/projects/${projectId}/updates`);
    if (!response.ok) {
        return;
    }
    const updates = await response.json();
    projectPageState.currentUpdates = updates;
    renderUpdates(updates);
}

function formatMoney(value) {
    return new Intl.NumberFormat(resolveProjectLocale(), {
        style: "currency",
        currency: projectPageState.currentProject?.currency || "RUB",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function resolveProjectProgress(project, stats) {
    const raised = stats?.totalAmount ?? project.collectedAmount;
    const goal = stats?.goalAmount ?? project.goalAmount;
    return window.RiseUpProjects.progress({...project, collectedAmount: raised, goalAmount: goal});
}

function formatDateTime(value) {
    if (!value) {
        return projectT("common.recently", "Recently");
    }
    return new Intl.DateTimeFormat(resolveProjectLocale(), {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function readProjectAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function setDonationStatus(message, type = "") {
    setProjectUiStatus(donationStatusNode, message, type);
}

function setPageStatus(message, type = "") {
    setProjectUiStatus(pageStatusNode, message, type);
}

function setCommentStatus(message, type = "") {
    setProjectUiStatus(commentStatusNode, message, type);
}

function setUpdateStatus(message, type = "") {
    setProjectUiStatus(updateStatusNode, message, type);
}

function setReviewStatus(message, type = "") {
    setProjectUiStatus(reviewStatusNode, message, type);
}

function confirmCommentDelete(t) {
    return new Promise((resolve) => {
        const modal = document.createElement("dialog");
        modal.className = "modal-dialog";
        modal.setAttribute("aria-labelledby", "comment-delete-confirm-title");
        modal.innerHTML = `<div class="modal-dialog-header"><h2 id="comment-delete-confirm-title">${escapeHtml(t("project.comment.deleteConfirm"))}</h2></div><p>${escapeHtml(t("project.comment.deleteDescription"))}</p><div class="modal-dialog-actions"><button class="ghost-btn" type="button" data-modal-close autofocus>${escapeHtml(t("common.cancel"))}</button><button class="primary-btn" type="button" data-confirm-accept>${escapeHtml(t("project.comment.delete"))}</button></div>`;
        modal.addEventListener("close", () => { const accepted = modal.returnValue === "confirm"; modal.remove(); resolve(accepted); }, {once: true});
        modal.querySelector("[data-confirm-accept]").addEventListener("click", () => modal.close("confirm"));
        document.body.append(modal);
        window.RiseUpUI.openModal(modal);
    });
}

function setActiveCommentReply(comment) {
    if (!projectAuth?.accessToken) {
        setCommentStatus("project.comment.login", "error");
        return;
    }

    projectPageState.replyToCommentId = comment.id;
    syncCommentReplyControls(comment);
    renderComments(projectPageState.currentComments);
    commentForm?.content?.focus();
}

function clearActiveCommentReply() {
    projectPageState.replyToCommentId = null;
    syncCommentReplyControls();
    renderComments(projectPageState.currentComments);
}

function syncCommentReplyControls(comment = null) {
    if (!commentForm || !commentReplyCancelButton) {
        return;
    }

    const activeComment = comment
        ?? projectPageState.currentComments.find((item) => item.id === projectPageState.replyToCommentId);
    const submitButton = commentForm.querySelector("button[type='submit']");
    const isReplying = Boolean(activeComment);

    commentReplyCancelButton.classList.toggle("hidden", !isReplying);
    if (submitButton) {
        submitButton.textContent = isReplying
            ? projectT("project.comment.postReply", "Post reply")
            : projectT("project.action.postComment", "Post comment");
    }
    commentNoteNode.textContent = isReplying
        ? projectT("project.comment.replyingTo", "Replying to {name}")
            .replace("{name}", activeComment.userDisplayName ?? projectT("app.anonymous", "Anonymous"))
        : projectT("project.comment.invite", "Share feedback or ask a question.");
}

function canReplyToComment(comment) {
    return Boolean(projectPageState.currentUser && !isDeletedComment(comment));
}

function canDeleteComment(comment) {
    const user = projectPageState.currentUser;
    if (!user || isDeletedComment(comment)) {
        return false;
    }

    return comment.userId === user.id || user.roles.includes("ADMIN");
}

function hasCurrentUserReview() {
    const currentUserId = projectPageState.currentUser?.id;
    return Boolean(
        currentUserId
        && projectPageState.currentReviews.some((review) => review.userId === currentUserId)
    );
}

function projectT(key, fallback = key) {
    return projectI18n?.t(key) ?? fallback;
}

function getProjectReviewAuthorBlockedText() {
    return projectT("project.review.authorBlocked");
}

function resolveProjectLocale() {
    return projectI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}

function renderProjectAuthor(project) {
    const name = project.authorDisplayName || projectT("project.unknownUser");
    document.getElementById("project-author-card").innerHTML = `${projectAvatar(project.authorId, name)}
        <div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(projectT("app.author"))}</p></div>
        <a href="/projects.html?authorId=${encodeURIComponent(project.authorId)}">${escapeHtml(projectT("project.authorProjects"))}</a>`;
}

function projectAvatar(id, name) {
    const initials = String(name).trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0] || "").join("").toUpperCase();
    return `<span class="project-person-avatar" aria-hidden="true" style="--profile-color:${window.RiseUpUI.resolveProfileColor(id)}">${escapeHtml(initials)}</span>`;
}

function projectCategoryHref(project) {
    return project.categoryId == null ? "/projects.html?uncategorized=true" : `/projects.html?categoryId=${encodeURIComponent(project.categoryId)}`;
}

async function loadRelatedProjects(project) {
    const url = new URL("/api/projects", window.location.origin);
    if (project.categoryId == null) url.searchParams.set("uncategorized", "true");
    else url.searchParams.set("categoryId", String(project.categoryId));
    url.searchParams.set("status", "ACTIVE");
    url.searchParams.set("size", "4");
    url.searchParams.set("sort", "createdAt,desc");
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("related");
        const payload = await response.json();
        projectPageState.relatedProjects = (payload.content ?? []).filter((item) => item.id !== project.id).slice(0, 3);
    } catch {
        projectPageState.relatedError = true;
    } finally {
        projectPageState.relatedLoaded = true;
        renderRelatedProjects();
    }
}

function renderRelatedProjects() {
    const project = projectPageState.currentProject;
    if (!project) return;
    document.getElementById("project-related-heading").textContent = project.categoryId == null
        ? projectT("project.relatedUncategorized") : projectT("project.relatedCategory").replace("{category}", window.RiseUpProjects.categoryTitle(project, projectPageState.categories));
    document.getElementById("project-related-link").href = projectCategoryHref(project);
    const grid = document.getElementById("project-related-grid");
    grid.setAttribute("aria-busy", String(!projectPageState.relatedLoaded));
    const message = !projectPageState.relatedLoaded ? "app.loading" : projectPageState.relatedError ? "catalog.error.load" : "project.relatedEmpty";
    grid.innerHTML = projectPageState.relatedProjects.length
        ? projectPageState.relatedProjects.map((item) => window.RiseUpProjects.renderCard(item, projectPageState.categories)).join("")
        : `<div class="empty-state" role="${projectPageState.relatedError ? "alert" : "status"}">${escapeHtml(projectT(message))}</div>`;
}

function isDeletedComment(comment) {
    return Boolean(comment.deleted || comment.content === "[deleted]");
}

function formatAmountInput(value) {
    return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function resolveDonationAmount() {
    return selectedQuickAmount ?? Number(document.getElementById("donation-amount").value.replace(/\s/g, ""));
}

function renderPaymentResult() {
    const banner = document.getElementById("project-payment-result");
    banner.hidden = paymentResultDismissed || !["success", "failed"].includes(paymentResult);
    if (banner.hidden) return;
    banner.dataset.result = paymentResult;
    banner.setAttribute("role", paymentResult === "failed" ? "alert" : "status");
    document.getElementById("payment-result-message").textContent = projectT(`project.payment.${paymentResult}`);
    document.getElementById("payment-result-icon").innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="${paymentResult === "success" ? "m7 12 3 3 7-7" : "M12 6v7m0 3v2"}"/></svg>`;
}

function syncDonationAmount() {
    const amount = resolveDonationAmount();
    const valid = Number.isFinite(amount) && amount >= 1;
    const button = document.getElementById("donation-submit");
    button.textContent = valid ? projectT("home.supportAmount").replace("{amount}", formatMoney(amount)) : projectT("project.action.donate");
    button.disabled = !valid || projectPageState.donationBusy;
    document.querySelectorAll("[data-donation-amount]").forEach((quick) => {
        quick.textContent = formatMoney(Number(quick.dataset.donationAmount));
        quick.setAttribute("aria-pressed", String(Number(quick.dataset.donationAmount) === selectedQuickAmount));
    });
}

function wireProjectInteractions() {
    document.getElementById("donation-amount").addEventListener("input", (event) => {
        selectedQuickAmount = null;
        const input = event.target;
        const digitsBeforeCaret = input.value.slice(0, input.selectionStart).replace(/\D/g, "").length;
        input.value = formatAmountInput(input.value);
        let caret = 0, digits = 0;
        while (caret < input.value.length && digits < digitsBeforeCaret) {
            if (/\d/.test(input.value[caret])) digits++;
            caret++;
        }
        input.setSelectionRange(caret, caret);
        syncDonationAmount();
    });
    document.querySelector(".project-quick-amounts").addEventListener("click", (event) => {
        const button = event.target.closest("[data-donation-amount]");
        if (!button) return;
        selectedQuickAmount = Number(button.dataset.donationAmount);
        document.getElementById("donation-amount").value = "";
        syncDonationAmount();
    });
    document.getElementById("payment-result-close").addEventListener("click", () => {
        paymentResultDismissed = true;
        renderPaymentResult();
    });
    const ratingButtons = [...document.querySelectorAll("[data-review-rating]")];
    const syncRating = () => ratingButtons.forEach((button) => {
        const selected = button.dataset.reviewRating === reviewForm.rating.value;
        button.setAttribute("aria-checked", String(selected));
        button.tabIndex = selected ? 0 : -1;
    });
    ratingButtons.forEach((button, index) => {
        button.addEventListener("click", () => { reviewForm.rating.value = button.dataset.reviewRating; syncRating(); });
        button.addEventListener("keydown", (event) => {
            const offsets = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1};
            if (!(event.key in offsets) && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? 4 : (index + offsets[event.key] + 5) % 5;
            ratingButtons[next].click();
            ratingButtons[next].focus();
        });
    });
    reviewForm.addEventListener("reset", () => queueMicrotask(syncRating));
    const syncCounters = () => document.querySelectorAll("[data-character-counter]").forEach((counter) => {
        const input = document.getElementById(counter.dataset.characterCounter);
        counter.textContent = `${input.value.length} / ${input.maxLength}`;
    });
    document.querySelectorAll(".project-detail-form").forEach((form) => {
        form.addEventListener("input", syncCounters);
        form.addEventListener("reset", () => queueMicrotask(syncCounters));
    });
    syncCounters();
    const links = [...document.querySelectorAll(".project-section-nav a")];
    const mark = (id) => links.forEach((link) => {
        if (link.hash === `#${id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
    });
    links.forEach((link) => link.addEventListener("click", () => mark(link.hash.slice(1))));
    if (window.IntersectionObserver) {
        const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
            if (entry.isIntersecting) mark(entry.target.id);
        }), {rootMargin: "-10% 0px -65% 0px"});
        document.querySelectorAll(".project-detail-section").forEach((section) => observer.observe(section));
    }
}

function setProjectUiStatus(node, message, type) {
    projectUiStatuses.set(node.id, {message, type});
    node.textContent = projectT(message, message);
    node.className = `auth-status ${type}`.trim();
    node.setAttribute("role", type === "error" ? "alert" : "status");
}

function refreshProjectUiStatuses() {
    projectUiStatuses.forEach(({message, type}, id) => setProjectUiStatus(document.getElementById(id), message, type));
}
