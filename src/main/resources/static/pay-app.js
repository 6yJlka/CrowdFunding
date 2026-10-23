const payAuth = readPayAuth();
const payDonationId = new URLSearchParams(window.location.search).get("donationId");
const payStatusNode = document.getElementById("pay-status");
const paySummaryNode = document.getElementById("pay-summary");
let payStatusState = {key: "", type: ""};

document.getElementById("pay-success-btn").addEventListener("click", () => finalizePayment(true));
document.getElementById("pay-fail-btn").addEventListener("click", () => finalizePayment(false));
document.addEventListener("app:lang-changed", renderPayment);

if (!payAuth?.accessToken) {
    window.location.href = "/auth.html";
} else if (!payDonationId) {
    setPayStatus("pay.missingId", "error");
} else {
    loadDonationSummary().catch(() => setPayStatus("pay.loadError", "error"));
}

async function loadDonationSummary() {
    setPayStatus("pay.loading", "info");
    const response = await fetch(`/api/me/donations/${payDonationId}`, {
        headers: {"Authorization": `${payAuth.tokenType || "Bearer"} ${payAuth.accessToken}`}
    });
    if (!response.ok) throw new Error("pay.loadError");
    window.currentPayDonation = await response.json();
    setPayStatus("pay.chooseResult", "success");
}

async function finalizePayment(success) {
    const donation = window.currentPayDonation;
    if (!donation?.externalPaymentId) {
        setPayStatus("pay.incomplete", "error");
        return;
    }
    setPayStatus(success ? "pay.confirming" : "pay.markingFailed", "info");
    const url = `/api/payments/webhook/${encodeURIComponent(donation.provider ?? "FAKE")}/${encodeURIComponent(donation.externalPaymentId)}?success=${success}`;
    let response;
    try { response = await fetch(url, {method: "POST"}); }
    catch { setPayStatus("pay.completeError", "error"); return; }
    if (!response.ok) {
        setPayStatus("pay.completeError", "error");
        return;
    }
    setPayStatus(success ? "pay.doneSuccess" : "pay.doneFailed", success ? "success" : "error");
    window.setTimeout(() => {
        window.location.href = `/project.html?id=${donation.projectId}&payment=${success ? "success" : "failed"}`;
    }, 700);
}

function renderPayment() {
    const donation = window.currentPayDonation;
    const t = (key) => window.AppI18n.t(key);
    payStatusNode.textContent = payStatusState.key && payStatusState.key !== "pay.chooseResult" ? t(payStatusState.key) : "";
    payStatusNode.className = `auth-status ${payStatusState.type}`.trim();
    payStatusNode.setAttribute("role", payStatusState.type === "error" ? "alert" : "status");
    if (!donation) return;
    paySummaryNode.classList.remove("hidden");
    document.getElementById("pay-project-title").textContent = donation.projectTitle || t("pay.untitled");
    document.getElementById("pay-amount").textContent = formatPayMoney(donation.amount);
    document.getElementById("pay-provider").textContent = !donation.provider || donation.provider === "FAKE" ? t("pay.fakeProvider") : donation.provider;
    document.getElementById("pay-number").textContent = donation.externalPaymentId || donation.id || payDonationId;
    const status = payStatusState.key === "pay.doneSuccess" ? "SUCCEEDED" : payStatusState.key === "pay.doneFailed" ? "FAILED" : (donation.status ?? "PENDING");
    const badge = document.getElementById("pay-donation-status");
    badge.dataset.status = status;
    badge.textContent = t(`donation.status.${status}`);
    const busy = ["pay.loading", "pay.confirming", "pay.markingFailed"].includes(payStatusState.key);
    const done = status !== "PENDING";
    document.getElementById("pay-actions").hidden = done;
    document.querySelectorAll(".payment-actions button").forEach((button) => { button.disabled = busy || done || !donation.externalPaymentId; });
    const result = document.getElementById("pay-result");
    result.hidden = !done;
    result.dataset.status = status;
    const outcome = status === "SUCCEEDED" ? "success" : status === "CANCELED" ? "canceled" : "failed";
    document.getElementById("pay-result-title").textContent = t(`pay.result.${outcome}.title`);
    document.getElementById("pay-result-text").textContent = t(`pay.result.${outcome}.text`);
    document.getElementById("pay-project-link").href = `/project.html?id=${encodeURIComponent(donation.projectId)}`;
}

function readPayAuth() {
    try { return JSON.parse(localStorage.getItem("crowdfunding_auth") || "null"); }
    catch { return null; }
}

function formatPayMoney(value) {
    return new Intl.NumberFormat(resolvePayLocale(), {style: "currency", currency: "RUB", maximumFractionDigits: 0}).format(Number(value ?? 0));
}

function setPayStatus(key, type = "") {
    payStatusState = {key, type};
    renderPayment();
}

function resolvePayLocale() {
    return window.AppI18n?.getLang?.() === "ru" ? "ru-RU" : "en-US";
}
