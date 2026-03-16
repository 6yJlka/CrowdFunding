const projectQuery = new URLSearchParams(window.location.search);
const projectId = projectQuery.get("id");
const paymentResult = projectQuery.get("payment");
const projectAuth = readProjectAuth();

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

const projectPageState = {
    currentUser: null,
    currentProject: null
};

if (!projectId) {
    document.getElementById("project-title").textContent = "Project id is missing";
} else {
    bootstrapProjectPage().catch(() => {
        document.getElementById("project-title").textContent = "Project unavailable";
    });
}

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
        throw new Error("Project not found");
    }

    const project = await projectResponse.json();
    projectPageState.currentProject = project;

    const stats = statsResponse.ok ? await statsResponse.json() : null;
    const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];
    const donationsPayload = donationsResponse.ok ? await donationsResponse.json() : {content: []};
    const updates = updatesResponse.ok ? await updatesResponse.json() : [];
    const comments = commentsResponse.ok ? await commentsResponse.json() : [];

    renderProjectPage(project, stats, reviews, donationsPayload.content ?? [], updates, comments);
}

function renderProjectPage(project, stats, reviews, donations, updates, comments) {
    const progress = Math.round(Number((stats?.progress ?? 0) * 100));
    document.getElementById("project-category").textContent = project.categoryTitle ?? "Project";
    document.getElementById("project-title").textContent = project.title;
    document.getElementById("project-description").textContent = project.description || project.shortDescription || "";
    document.getElementById("project-progress-value").textContent = `${progress}%`;
    document.getElementById("project-progress-bar").style.width = `${Math.min(progress, 100)}%`;
    document.getElementById("project-metrics").innerHTML = `
        <div class="metric-box"><span>Raised</span><strong>${formatMoney(stats?.totalAmount ?? project.collectedAmount)}</strong></div>
        <div class="metric-box"><span>Goal</span><strong>${formatMoney(stats?.goalAmount ?? project.goalAmount)}</strong></div>
        <div class="metric-box"><span>Donors</span><strong>${stats?.totalDonors ?? 0}</strong></div>
        <div class="metric-box"><span>Author</span><strong>${escapeHtml(project.authorDisplayName ?? "Unknown")}</strong></div>
    `;

    renderDonations(donations);
    renderReviews(reviews);
    renderUpdates(updates);
    renderComments(comments);
}

function renderDonations(donations) {
    const donationsNode = document.getElementById("project-donations");
    donationsNode.innerHTML = donations.length
        ? donations.map((donation) => `
            <article class="review-card donation-card">
                <div class="review-head">
                    <strong>${escapeHtml(donation.sponsorDisplayName ?? "Anonymous sponsor")}</strong>
                    <span class="donation-amount">${formatMoney(donation.amount)}</span>
                </div>
                <p>${escapeHtml(donation.status ?? "SUCCEEDED")} · ${formatDateTime(donation.confirmedAt || donation.createdAt)}</p>
            </article>
        `).join("")
        : `<div class="empty-state">No public donations yet.</div>`;
}

function renderReviews(reviews) {
    const reviewsNode = document.getElementById("project-reviews");
    reviewsNode.innerHTML = reviews.length
        ? reviews.map((review) => `
            <article class="review-card">
                <div class="review-head">
                    <strong>${escapeHtml(review.userDisplayName ?? "Anonymous")}</strong>
                    <span class="review-rating">${"★".repeat(review.rating || 0)}</span>
                </div>
                <p>${escapeHtml(review.reviewText ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">No reviews yet.</div>`;
}

function renderUpdates(updates) {
    const updatesNode = document.getElementById("project-updates");
    updatesNode.innerHTML = updates.length
        ? updates.map((update) => `
            <article class="timeline-card">
                <div class="timeline-meta">
                    <strong>${escapeHtml(update.title ?? "Update")}</strong>
                    <span>${formatDateTime(update.createdAt)}</span>
                </div>
                <p class="timeline-author">${escapeHtml(update.authorDisplayName ?? "Author")}</p>
                <p>${escapeHtml(update.content ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">No updates published yet.</div>`;
}

function renderComments(comments) {
    const commentsNode = document.getElementById("project-comments");
    commentsNode.innerHTML = comments.length
        ? comments.map((comment) => `
            <article class="review-card comment-card${comment.deleted ? " comment-card-deleted" : ""}">
                <div class="review-head">
                    <strong>${escapeHtml(comment.userDisplayName ?? "Anonymous")}</strong>
                    <span>${formatDateTime(comment.createdAt)}</span>
                </div>
                <p>${escapeHtml(comment.content ?? "")}</p>
            </article>
        `).join("")
        : `<div class="empty-state">No comments yet.</div>`;
}

function initializeRoleAwarePanels() {
    if (paymentResult === "success") {
        setPageStatus("Payment succeeded. Project funding was updated.", "success");
    } else if (paymentResult === "failed") {
        setPageStatus("Payment failed. You can try again.", "error");
    }

    donationForm.classList.add("hidden");
    reviewForm.classList.add("hidden");
    commentForm.classList.add("hidden");
    updateForm.classList.add("hidden");

    donationNoteNode.textContent = "Log in as sponsor to support this campaign.";
    reviewNoteNode.textContent = "Log in to leave a review.";
    commentNoteNode.textContent = "Log in to join the discussion.";
    updateNoteNode.textContent = "Only the project author can publish updates here.";
    updateNoteNode.classList.remove("hidden");

    const user = projectPageState.currentUser;
    const project = projectPageState.currentProject;
    if (!user || !project) {
        return;
    }

    reviewForm.classList.remove("hidden");
    reviewNoteNode.textContent = "Rate this project and share feedback.";
    reviewForm.addEventListener("submit", submitReviewForm);

    commentForm.classList.remove("hidden");
    commentNoteNode.textContent = "Share feedback or ask a question.";
    commentForm.addEventListener("submit", submitCommentForm);

    if (user.roles.includes("SPONSOR")) {
        donationForm.classList.remove("hidden");
        donationNoteNode.textContent = "You are logged in as sponsor. Donation will open the demo payment page.";
        donationForm.addEventListener("submit", submitDonationForm);
    } else if (user.roles.includes("AUTHOR")) {
        donationNoteNode.textContent = "Authors cannot donate from this account. Use a sponsor account.";
    } else if (user.roles.includes("ADMIN")) {
        donationNoteNode.textContent = "Admins do not use the donation flow.";
    }

    const isProjectAuthor = user.id === project.authorId;
    if (isProjectAuthor && project.status !== "DRAFT") {
        updateForm.classList.remove("hidden");
        updateNoteNode.textContent = "Publish timeline updates for your backers.";
        updateForm.addEventListener("submit", submitUpdateForm);
    }
}

async function submitDonationForm(event) {
    event.preventDefault();

    const amountValue = Number(document.getElementById("donation-amount").value);
    if (!amountValue || amountValue <= 0) {
        setDonationStatus("Enter a valid donation amount", "error");
        return;
    }

    setDonationStatus("Creating donation...", "info");

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
            throw new Error(body.message || body.error || "Could not create donation");
        }

        setDonationStatus("Redirecting to payment...", "success");
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
        setCommentStatus("Comment cannot be empty", "error");
        return;
    }

    setCommentStatus("Posting comment...", "info");

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
            throw new Error(body.message || body.error || "Could not post comment");
        }

        form.reset();
        setCommentStatus("Comment posted", "success");
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
        setReviewStatus("Provide a rating and review text", "error");
        return;
    }

    setReviewStatus("Posting review...", "info");

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
            throw new Error(body.message || body.error || "Could not post review");
        }

        form.reset();
        form.rating.value = "5";
        setReviewStatus("Review posted", "success");
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
        setUpdateStatus("Fill in both title and content", "error");
        return;
    }

    setUpdateStatus("Publishing update...", "info");

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
            throw new Error(body.message || body.error || "Could not publish update");
        }

        form.reset();
        setUpdateStatus("Update published", "success");
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
    renderComments(comments);
}

async function refreshReviews() {
    const response = await fetch(`/api/projects/${projectId}/reviews`);
    if (!response.ok) {
        return;
    }
    const reviews = await response.json();
    renderReviews(reviews);
}

async function refreshUpdates() {
    const response = await fetch(`/api/projects/${projectId}/updates`);
    if (!response.ok) {
        return;
    }
    const updates = await response.json();
    renderUpdates(updates);
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function formatDateTime(value) {
    if (!value) {
        return "Recently";
    }
    return new Intl.DateTimeFormat("en-US", {
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
