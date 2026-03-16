const payAuth = readPayAuth();
const payDonationId = new URLSearchParams(window.location.search).get("donationId");
const payStatusNode = document.getElementById("pay-status");
const paySummaryNode = document.getElementById("pay-summary");

document.getElementById("pay-success-btn").addEventListener("click", () => finalizePayment(true));
document.getElementById("pay-fail-btn").addEventListener("click", () => finalizePayment(false));

if (!payAuth?.accessToken) {
    window.location.href = "/auth.html";
} else if (!payDonationId) {
    setPayStatus("Donation id is missing", "error");
} else {
    loadDonationSummary().catch((error) => setPayStatus(error.message, "error"));
}

async function loadDonationSummary() {
    setPayStatus("Loading payment...", "info");
    const response = await fetch(`/api/me/donations/${payDonationId}`, {
        headers: {
            "Authorization": `${payAuth.tokenType || "Bearer"} ${payAuth.accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Could not load donation");
    }

    const donation = await response.json();
    window.currentPayDonation = donation;
    paySummaryNode.classList.remove("hidden");
    paySummaryNode.innerHTML = `
        <strong>Project:</strong> ${escapePayHtml(donation.projectTitle ?? "Untitled")}<br>
        <strong>Amount:</strong> ${formatPayMoney(donation.amount)}<br>
        <strong>Provider:</strong> ${escapePayHtml(donation.provider ?? "FAKE")}<br>
        <strong>Status:</strong> ${escapePayHtml(donation.status ?? "PENDING")}
    `;
    setPayStatus("Choose the payment result", "success");
}

async function finalizePayment(success) {
    const donation = window.currentPayDonation;
    if (!donation?.externalPaymentId) {
        setPayStatus("Payment information is incomplete", "error");
        return;
    }

    setPayStatus(success ? "Confirming payment..." : "Marking payment as failed...", "info");

    const url = `/api/payments/webhook/${encodeURIComponent(donation.provider ?? "FAKE")}/${encodeURIComponent(donation.externalPaymentId)}?success=${success}`;
    const response = await fetch(url, {method: "POST"});

    if (!response.ok) {
        setPayStatus("Could not complete payment", "error");
        return;
    }

    setPayStatus(success ? "Payment succeeded" : "Payment failed", success ? "success" : "error");
    window.setTimeout(() => {
        window.location.href = `/project.html?id=${donation.projectId}&payment=${success ? "success" : "failed"}`;
    }, 700);
}

function readPayAuth() {
    try {
        return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null");
    } catch {
        return null;
    }
}

function formatPayMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    }).format(Number(value ?? 0));
}

function setPayStatus(message, type = "") {
    payStatusNode.textContent = message;
    payStatusNode.className = `auth-status ${type}`.trim();
}

function escapePayHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
