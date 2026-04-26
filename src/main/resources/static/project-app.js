const projectQuery = new URLSearchParams(window.location.search);
const projectId = projectQuery.get("id");
const paymentResult = projectQuery.get("payment");
const projectAuth = readProjectAuth();
const projectI18n = window.AppI18n;

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
    currentComments: []
};
document.addEventListener("app:lang-changed", () => {
    if (!projectPageState.currentProject) {
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
    document.getElementById("project-title").textContent = projectT("project.error.missingId", "Project id is missing");
} else {
    bootstrapProjectPage().catch(() => {
        document.getElementById("project-title").textContent = projectT("app.unavailable", "Project unavailable");
    });
}

commentsNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-comment-delete]");
    if (!button) {
        return;
    }

    if (!projectAuth?.accessToken) {
        setCommentStatus(projectT("project.comment.loginManage", "Log in to manage comments"), "error");
        return;
    }

    const commentId = button.getAttribute("data-comment-delete");
    if (!commentId || !window.confirm(projectT("project.comment.deleteConfirm", "Delete this comment?"))) {
        return;
    }

    setCommentStatus(projectT("project.comment.deleting", "Deleting comment..."), "info");

    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            }
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.message || body.error || projectT("project.comment.deleteError", "Could not delete comment"));
        }

        setCommentStatus(projectT("project.comment.deleted", "Comment deleted"), "success");
        await refreshComments();
    } catch (error) {
        setCommentStatus(error.message, "error");
    }
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
    const [projectResponse, statsResponse, reviewsResponse, donationsResponse, updatesResponse, commentsResponse] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/statistics`),
        fetch(`/api/projects/${id}/reviews`),
        fetch(`/api/projects/${id}/donations/public?size=3`),
        fetch(`/api/projects/${id}/updates`),
        fetch(`/api/projects/${id}/comments`)
    ]);

    if (!projectResponse.ok) {
        throw new Error(projectT("project.error.notFound", "Project not found"));
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

    renderProjectPage(project, stats, reviews, projectPageState.currentDonations, updates, comments);
}

function renderProjectPage(project, stats, reviews, donations, updates, comments) {
    const progress = resolveProjectProgress(project, stats);
    document.getElementById("project-category").textContent = project.categoryTitle ?? projectT("app.project", "Project");
    document.getElementById("project-title").textContent = project.title;
    document.getElementById("project-cover-slot").innerHTML = renderProjectPageCover(project);
    document.getElementById("project-description").textContent = project.description || project.shortDescription || "";
    document.getElementById("project-progress-value").textContent = `${progress}%`;
    document.getElementById("project-progress-bar").style.width = `${Math.min(progress, 100)}%`;
    document.getElementById("project-metrics").innerHTML = `
        <div class="metric-box"><span>${projectT("app.raisedCap", "Raised")}</span><strong>${formatMoney(stats?.totalAmount ?? project.collectedAmount)}</strong></div>
        <div class="metric-box"><span>${projectT("app.goal", "Goal")}</span><strong>${formatMoney(stats?.goalAmount ?? project.goalAmount)}</strong></div>
        <div class="metric-box"><span>${projectT("project.donors", "Donors")}</span><strong>${stats?.totalDonors ?? 0}</strong></div>
        <div class="metric-box"><span>${projectT("app.author", "Author")}</span><strong>${escapeHtml(project.authorDisplayName ?? projectT("app.unknown", "Unknown"))}</strong></div>
    `;

    renderDonations(donations);
    renderReviews(reviews);
    renderUpdates(updates);
    renderComments(comments);
}

function renderProjectPageCover(project) {
    const className = "project-modal-cover project-page-cover";
    if (project?.hasCoverImage && project?.id) {
        return `<img class="${className} project-cover-image" src="/api/projects/${encodeURIComponent(project.id)}/image" alt="${escapeHtml(project.title ?? "Project")}">`;
    }

    const category = project.categoryTitle ?? projectT("app.project", "Project");
    const initials = getProjectPageCoverInitials(project?.title);
    const tone = getProjectPageCoverTone(project);

    return `
        <div class="${className} ${tone}">
            <div class="project-cover-glow"></div>
            <div class="project-cover-copy">
                <strong>${escapeHtml(initials)}</strong>
                <span>${escapeHtml(category)}</span>
            </div>
        </div>
    `;
}

function getProjectPageCoverInitials(title) {
    const parts = String(title ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return "PR";
    }

    return parts.slice(0, 2)
        .map((part) => Array.from(part)[0] ?? "")
        .join("")
        .toUpperCase();
}

function getProjectPageCoverTone(project) {
    const source = `${project?.categoryTitle ?? ""}:${project?.title ?? ""}`;
    const tones = ["cover-violet", "cover-sky", "cover-green", "cover-amber", "cover-coral"];
    let hash = 0;

    for (const symbol of source) {
        hash = ((hash * 31) + symbol.charCodeAt(0)) >>> 0;
    }

    return tones[hash % tones.length];
}

function renderDonations(donations) {
    const donationsNode = document.getElementById("project-donations");
    donationsNode.innerHTML = donations.length
        ? donations.map((donation) => `
            <article class="review-card donation-card">
                <div class="review-head">
                    <strong>${escapeHtml(donation.sponsorDisplayName ?? projectT("project.anonymousSponsor", "Anonymous sponsor"))}</strong>
                    <span class="donation-amount">${formatMoney(donation.amount)}</span>
                </div>
                <p>${escapeHtml(donation.status ?? "SUCCEEDED")} · ${formatDateTime(donation.confirmedAt || donation.createdAt)}</p>
            </article>
        `).join("")
        : `<div class="empty-state">${projectT("project.noPublicDonations", "No public donations yet.")}</div>`;
}

function renderReviews(reviews) {
    const reviewsNode = document.getElementById("project-reviews");
    const currentUserId = projectPageState.currentUser?.id;
    const hasOwnReview = Boolean(currentUserId && reviews.some((review) => review.userId === currentUserId));
    const isProjectAuthor = Boolean(currentUserId && currentUserId === projectPageState.currentProject?.authorId);

    if (currentUserId) {
        reviewForm.classList.toggle("hidden", hasOwnReview || isProjectAuthor);
        reviewNoteNode.textContent = isProjectAuthor
            ? getProjectReviewAuthorBlockedText()
            : hasOwnReview
            ? projectT("project.review.already", "You have already posted a review for this project.")
            : projectT("project.review.rate", "Rate this project and share feedback.");
    }

    reviewsNode.innerHTML = reviews.length
        ? reviews.map((review) => `
            <article class="review-card">
                <div class="review-head">
                        <strong>${escapeHtml(review.userDisplayName ?? projectT("app.anonymous", "Anonymous"))}</strong>
                    <span class="review-rating">${"★".repeat(review.rating || 0)}</span>
                </div>
                <p>${escapeHtml(review.reviewText ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">${projectT("project.review.none", "No reviews yet.")}</div>`;
}

function renderUpdates(updates) {
    const updatesNode = document.getElementById("project-updates");
    updatesNode.innerHTML = updates.length
        ? updates.map((update) => `
            <article class="timeline-card">
                <div class="timeline-meta">
                    <strong>${escapeHtml(update.title ?? projectT("project.update.titleDefault", "Update"))}</strong>
                    <span>${formatDateTime(update.createdAt)}</span>
                </div>
                <p class="timeline-author">${escapeHtml(update.authorDisplayName ?? projectT("app.author", "Author"))}</p>
                <p>${escapeHtml(update.content ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">${projectT("project.update.none", "No updates published yet.")}</div>`;
}

function renderComments(comments) {
    commentsNode.innerHTML = comments.length
        ? comments.map((comment) => `
            <article class="review-card comment-card${comment.deleted ? " comment-card-deleted" : ""}">
                <div class="review-head">
                    <strong>${escapeHtml(comment.userDisplayName ?? projectT("app.anonymous", "Anonymous"))}</strong>
                    <span>${formatDateTime(comment.createdAt)}</span>
                </div>
                <p>${escapeHtml(comment.content ?? "")}</p>
                ${canDeleteComment(comment) ? `
                    <div class="form-actions">
                        <button class="ghost-btn small-btn" type="button" data-comment-delete="${comment.id}">${projectT("project.comment.delete", "Delete comment")}</button>
                    </div>
                ` : ""}
            </article>
        `).join("")
        : `<div class="empty-state">${projectT("project.comment.none", "No comments yet.")}</div>`;
}

function initializeRoleAwarePanels() {
    if (paymentResult === "success") {
        setPageStatus(projectT("project.payment.success", "Payment succeeded. Project funding was updated."), "success");
    } else if (paymentResult === "failed") {
        setPageStatus(projectT("project.payment.failed", "Payment failed. You can try again."), "error");
    }

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

    if (user.roles.includes("SPONSOR")) {
        donationForm.classList.remove("hidden");
        donationNoteNode.textContent = projectT("project.donation.sponsorFlow", "You are logged in as sponsor. Donation will open the demo payment page.");
        donationForm.onsubmit = submitDonationForm;
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

    const amountValue = Number(document.getElementById("donation-amount").value);
    if (!amountValue || amountValue <= 0) {
        setDonationStatus(projectT("project.donation.invalidAmount", "Enter a valid donation amount"), "error");
        return;
    }

    setDonationStatus(projectT("project.donation.creating", "Creating donation..."), "info");

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
            throw new Error(body.message || body.error || projectT("project.donation.createError", "Could not create donation"));
        }

        setDonationStatus(projectT("project.donation.redirecting", "Redirecting to payment..."), "success");
        window.setTimeout(() => {
            window.location.href = body.paymentUrl;
        }, 500);
    } catch (error) {
        setDonationStatus(error.message, "error");
    }
}

async function submitCommentForm(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const content = form.content.value.trim();
    if (!content) {
        setCommentStatus(projectT("project.comment.empty", "Comment cannot be empty"), "error");
        return;
    }

    setCommentStatus(projectT("project.comment.posting", "Posting comment..."), "info");

    try {
        const response = await fetch(`/api/projects/${projectId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${projectAuth.tokenType || "Bearer"} ${projectAuth.accessToken}`
            },
            body: JSON.stringify({content})
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || body.error || projectT("project.comment.postError", "Could not post comment"));
        }

        form.reset();
        setCommentStatus(projectT("project.comment.posted", "Comment posted"), "success");
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
        setReviewStatus(projectT("project.review.invalid", "Provide a rating and review text"), "error");
        return;
    }

    setReviewStatus(projectT("project.review.posting", "Posting review..."), "info");

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
            throw new Error(body.message || body.error || projectT("project.review.postError", "Could not post review"));
        }

        form.reset();
        form.rating.value = "5";
        setReviewStatus(projectT("project.review.posted", "Review posted"), "success");
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
        setUpdateStatus(projectT("project.update.invalid", "Fill in both title and content"), "error");
        return;
    }

    setUpdateStatus(projectT("project.update.publishing", "Publishing update..."), "info");

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
            throw new Error(body.message || body.error || projectT("project.update.publishError", "Could not publish update"));
        }

        form.reset();
        setUpdateStatus(projectT("project.update.published", "Update published"), "success");
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
    const statsProgress = Number(stats?.progress);
    if (Number.isFinite(statsProgress) && statsProgress >= 0) {
        return Math.max(0, Math.round(statsProgress));
    }

    const raised = Number(stats?.totalAmount ?? project?.collectedAmount ?? 0);
    const goal = Number(stats?.goalAmount ?? project?.goalAmount ?? 0);
    if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
        return 0;
    }

    return Math.max(0, Math.round((raised / goal) * 100));
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
    donationStatusNode.textContent = message;
    donationStatusNode.className = `auth-status ${type}`.trim();
}

function setPageStatus(message, type = "") {
    pageStatusNode.textContent = message;
    pageStatusNode.className = `auth-status ${type}`.trim();
}

function setCommentStatus(message, type = "") {
    commentStatusNode.textContent = message;
    commentStatusNode.className = `auth-status ${type}`.trim();
}

function setUpdateStatus(message, type = "") {
    updateStatusNode.textContent = message;
    updateStatusNode.className = `auth-status ${type}`.trim();
}

function setReviewStatus(message, type = "") {
    reviewStatusNode.textContent = message;
    reviewStatusNode.className = `auth-status ${type}`.trim();
}

function canDeleteComment(comment) {
    const user = projectPageState.currentUser;
    if (!user || comment?.deleted) {
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

function projectT(key, fallback) {
    return projectI18n?.t(key) ?? fallback;
}

function getProjectReviewAuthorBlockedText() {
    if (projectI18n?.getLang?.() === "ru") {
        return "Нельзя оставить отзыв на свой собственный проект.";
    }

    const translated = projectI18n?.t?.("project.review.authorBlocked");
    if (translated && translated !== "project.review.authorBlocked") {
        return translated;
    }

    return "You cannot review your own project.";
}

function resolveProjectLocale() {
    return projectI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}
