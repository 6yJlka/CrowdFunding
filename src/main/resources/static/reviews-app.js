const reviewsI18n = window.AppI18n;
const reviewsState = {
    page: 0,
    size: 12,
    totalPages: 0,
    query: ""
};

bootstrapReviewsPage().catch((error) => setReviewsStatus(error.message, "error"));

function bootstrapReviewsPage() {
    hydrateReviewsState();
    wireReviewsEvents();
    return loadReviews();
}

function hydrateReviewsState() {
    const params = new URLSearchParams(window.location.search);
    reviewsState.page = Math.max(Number(params.get("page") ?? "0"), 0);
    reviewsState.query = params.get("q")?.trim() ?? "";
    document.getElementById("reviews-search").value = reviewsState.query;
}

function wireReviewsEvents() {
    document.getElementById("reviews-search-btn").addEventListener("click", submitReviewsSearch);
    document.getElementById("reviews-search").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            submitReviewsSearch();
        }
    });
    document.getElementById("reviews-prev-btn").addEventListener("click", () => changeReviewsPage(-1));
    document.getElementById("reviews-next-btn").addEventListener("click", () => changeReviewsPage(1));
}

function submitReviewsSearch() {
    reviewsState.query = document.getElementById("reviews-search").value.trim();
    reviewsState.page = 0;
    syncReviewsUrl();
    loadReviews().catch((error) => setReviewsStatus(error.message, "error"));
}

function changeReviewsPage(delta) {
    const nextPage = reviewsState.page + delta;
    if (nextPage < 0 || nextPage >= Math.max(reviewsState.totalPages, 1)) {
        return;
    }
    reviewsState.page = nextPage;
    syncReviewsUrl();
    loadReviews().catch((error) => setReviewsStatus(error.message, "error"));
}

async function loadReviews() {
    setReviewsStatus(reviewsT("reviews.loading", "Loading reviews..."), "info");
    const url = new URL("/api/showcase/reviews", window.location.origin);
    url.searchParams.set("size", `${reviewsState.size}`);
    url.searchParams.set("page", `${reviewsState.page}`);
    if (reviewsState.query) {
        url.searchParams.set("q", reviewsState.query);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(reviewsT("reviews.error", "Could not load review feed"));
    }

    const payload = await response.json();
    reviewsState.totalPages = payload.totalPages ?? 0;
    renderReviews(payload.content ?? []);
    updateReviewsPagination();
    setReviewsStatus(
        reviewsT("reviews.found", "Found reviews: {count}").replace("{count}", `${payload.totalElements ?? 0}`),
        "success"
    );
}

function renderReviews(items) {
    const feed = document.getElementById("reviews-feed");
    if (!items.length) {
        feed.innerHTML = `<div class="empty-state">${escapeReviewsHtml(reviewsT("reviews.empty", "No reviews found."))}</div>`;
        return;
    }

    feed.innerHTML = items.map((review) => `
        <article class="review-card">
            <div class="review-head">
                <strong>${escapeReviewsHtml(review.userDisplayName ?? reviewsT("app.anonymous", "Anonymous"))}</strong>
                <span class="review-rating">${"★".repeat(review.rating || 0)}</span>
            </div>
            <p class="review-meta-row">
                <a href="/project.html?id=${review.projectId}">${escapeReviewsHtml(review.projectTitle ?? reviewsT("app.project", "Project"))}</a>
                <span>·</span>
                <span>${escapeReviewsHtml(formatReviewsDate(review.createdAt))}</span>
            </p>
            <p>${escapeReviewsHtml(review.reviewText ?? "")}</p>
        </article>
    `).join("");
}

function updateReviewsPagination() {
    document.getElementById("reviews-pagination-copy").textContent = reviewsT("catalog.pageOf", "Page {page} of {total}")
        .replace("{page}", `${reviewsState.page + 1}`)
        .replace("{total}", `${Math.max(reviewsState.totalPages, 1)}`);
    document.getElementById("reviews-prev-btn").textContent = window.AppI18n.t("projects.prev");
    document.getElementById("reviews-next-btn").textContent = window.AppI18n.t("projects.next");
    document.getElementById("reviews-prev-btn").disabled = reviewsState.page <= 0;
    document.getElementById("reviews-next-btn").disabled = reviewsState.page >= Math.max(reviewsState.totalPages - 1, 0);
}

function syncReviewsUrl() {
    const url = new URL(window.location.href);
    if (reviewsState.query) {
        url.searchParams.set("q", reviewsState.query);
    } else {
        url.searchParams.delete("q");
    }
    if (reviewsState.page > 0) {
        url.searchParams.set("page", `${reviewsState.page}`);
    } else {
        url.searchParams.delete("page");
    }
    window.history.replaceState({}, "", url.search);
}

function setReviewsStatus(message, type = "") {
    const node = document.getElementById("reviews-status");
    node.textContent = message;
    node.className = `auth-status ${type}`.trim();
}

function formatReviewsDate(value) {
    if (!value) {
        return reviewsT("common.recently", "Recently");
    }
    return new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric"}).format(new Date(value));
}

function escapeReviewsHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function reviewsT(key, fallback) {
    return reviewsI18n?.t(key) ?? fallback;
}
