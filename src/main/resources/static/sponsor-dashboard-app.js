const sponsorAuth = readSponsorAuth();
const sponsorProjectsNode = document.getElementById("sponsor-projects");
const sponsorStatusNode = document.getElementById("sponsor-status");

if (!sponsorAuth?.accessToken) {
    window.location.href = "/auth.html";
}

loadSponsorProjects().catch((error) => setSponsorStatus(error.message, "error"));

async function loadSponsorProjects() {
    const response = await fetch("/api/me/donations?size=24", {
        headers: {
            "Authorization": `${sponsorAuth.tokenType || "Bearer"} ${sponsorAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not load sponsored projects");
    }

    const payload = await response.json();
    renderSponsoredProjects(payload.content ?? []);
}

function renderSponsoredProjects(items) {
    if (!items.length) {
        sponsorProjectsNode.innerHTML = `<div class="empty-state">You have not sponsored any projects yet.</div>`;
        return;
    }

    sponsorProjectsNode.innerHTML = items.map((item) => `
        <article class="project-card">
            <div class="project-card-header">
                <span class="status-badge">${escapeSponsorHtml(item.status ?? "UNKNOWN")}</span>
                <span class="meta-pill">${escapeSponsorHtml(item.provider ?? "Provider")}</span>
            </div>
            <h4>${escapeSponsorHtml(item.projectTitle ?? "Untitled")}</h4>
            <p>Donation amount: ${formatSponsorMoney(item.amount)}</p>
            <div class="project-card-footer">
                <strong>${escapeSponsorHtml(item.externalPaymentId ?? "No payment id")}</strong>
                <a class="ghost-btn" href="/project.html?id=${item.projectId}">Open project</a>
            </div>
        </article>
    `).join("");
}

function readSponsorAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function setSponsorStatus(message, type = "") {
    sponsorStatusNode.textContent = message;
    sponsorStatusNode.className = `auth-status ${type}`.trim();
}

function formatSponsorMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function escapeSponsorHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
