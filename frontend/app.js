const API_BASE = "http://localhost:5000";

let cashChart = null;
let cashProjectionChart = null;
let allPayables = [];
let allScenarios = [];

const originalFetch = window.fetch.bind(window);


/* =====================================================
   AUTHENTICATED FETCH
   ===================================================== */

window.fetch = async function (url, options = {}) {

    const token = localStorage.getItem("payopti_token");

    options = {
        ...options,
        headers: {
            ...(options.headers || {})
        }
    };

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    const response = await originalFetch(url, options);

    if (response.status === 401 && token) {

        localStorage.removeItem("payopti_token");
        localStorage.removeItem("payopti_user");

        showAuthScreen();
    }

    return response;
};


/* =====================================================
   HELPERS
   ===================================================== */

function money(value) {

    const number = Number(value || 0);

    return "₹" + number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


async function getJSON(url) {

    const response = await fetch(
        `${API_BASE}${url}`
    );

    const data = await response.json();

    if (!response.ok) {

        throw new Error(
            data.message ||
            data.error ||
            "Request failed"
        );
    }

    return data;
}


/* =====================================================
   AUTH SCREEN
   ===================================================== */

function showLogin() {

    const loginBox =
        document.getElementById("loginBox");

    const signupBox =
        document.getElementById("signupBox");

    if (loginBox) {
        loginBox.style.display = "block";
    }

    if (signupBox) {
        signupBox.style.display = "none";
    }

    setAuthMessage(
        "loginMessage",
        ""
    );

    setAuthMessage(
        "signupMessage",
        ""
    );
}


function showSignup() {

    const loginBox =
        document.getElementById("loginBox");

    const signupBox =
        document.getElementById("signupBox");

    if (loginBox) {
        loginBox.style.display = "none";
    }

    if (signupBox) {
        signupBox.style.display = "block";
    }

    setAuthMessage(
        "loginMessage",
        ""
    );

    setAuthMessage(
        "signupMessage",
        ""
    );
}


function showAuthScreen() {

    const authScreen =
        document.getElementById("authScreen");

    if (authScreen) {
        authScreen.style.display = "flex";
    }

    showLogin();
}


function hideAuthScreen() {

    const authScreen =
        document.getElementById("authScreen");

    if (authScreen) {
        authScreen.style.display = "none";
    }
}


function setAuthMessage(
    elementId,
    message,
    type = ""
) {

    const element =
        document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        `auth-message ${type}`;
}


function toggleAuthPassword(
    id,
    button
) {

    const input =
        document.getElementById(id);

    if (!input) {
        return;
    }

    if (input.type === "password") {

        input.type = "text";

        button.textContent = "Hide";

    } else {

        input.type = "password";

        button.textContent = "Show";
    }
}


/* =====================================================
   USER
   ===================================================== */

function updateLoggedUser(user) {

    if (!user) {
        return;
    }

    const name =
        user.name || "Finance User";

    const role =
        user.role || "Finance User";

    const avatar =
        document.getElementById(
            "loggedUserAvatar"
        );

    const nameElement =
        document.getElementById(
            "loggedUserName"
        );

    const roleElement =
        document.getElementById(
            "loggedUserRole"
        );

    if (avatar) {

        avatar.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }

    if (nameElement) {
        nameElement.textContent = name;
    }

    if (roleElement) {
        roleElement.textContent = role;
    }
}


/* =====================================================
   LOGIN
   ===================================================== */

async function loginUser(
    email,
    password
) {

    const response =
        await originalFetch(
            `${API_BASE}/api/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            data.message ||
            data.error ||
            "Invalid email or password."
        );
    }


    localStorage.setItem(
        "payopti_token",
        data.token
    );


    localStorage.setItem(
        "payopti_user",
        JSON.stringify(data.user)
    );


    updateLoggedUser(
        data.user
    );


    hideAuthScreen();


    await loadDashboard();
}


/* =====================================================
   REGISTER
   ===================================================== */

async function registerUser(
    name,
    email,
    password
) {

    const response =
        await originalFetch(
            `${API_BASE}/api/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            }
        );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (!response.ok) {

        throw new Error(
            data.message ||
            data.error ||
            "Registration failed."
        );
    }


    return data;
}


/* =====================================================
   LOGOUT
   ===================================================== */

function logout() {

    localStorage.removeItem(
        "payopti_token"
    );

    localStorage.removeItem(
        "payopti_user"
    );

    showAuthScreen();
}


/* =====================================================
   AUTH INITIALIZATION
   ===================================================== */

function initializeAuthentication() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );

    const signupForm =
        document.getElementById(
            "signupForm"
        );


    /* LOGIN */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const email =
                    document
                        .getElementById(
                            "loginEmail"
                        )
                        .value
                        .trim();


                const password =
                    document
                        .getElementById(
                            "loginPassword"
                        )
                        .value;


                setAuthMessage(
                    "loginMessage",
                    "Signing in..."
                );


                try {

                    await loginUser(
                        email,
                        password
                    );

                    setAuthMessage(
                        "loginMessage",
                        ""
                    );

                } catch (error) {

                    setAuthMessage(
                        "loginMessage",
                        error.message,
                        "error"
                    );
                }

            }
        );
    }


    /* SIGN UP */

    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const name =
                    document
                        .getElementById(
                            "signupName"
                        )
                        .value
                        .trim();


                const email =
                    document
                        .getElementById(
                            "signupEmail"
                        )
                        .value
                        .trim();


                const password =
                    document
                        .getElementById(
                            "signupPassword"
                        )
                        .value;


                const confirmPassword =
                    document
                        .getElementById(
                            "signupConfirmPassword"
                        )
                        .value;


                if (password.length < 6) {

                    setAuthMessage(
                        "signupMessage",
                        "Password must contain at least 6 characters.",
                        "error"
                    );

                    return;
                }


                if (
                    password !==
                    confirmPassword
                ) {

                    setAuthMessage(
                        "signupMessage",
                        "Passwords do not match.",
                        "error"
                    );

                    return;
                }


                setAuthMessage(
                    "signupMessage",
                    "Creating account..."
                );


                try {

                    await registerUser(
                        name,
                        email,
                        password
                    );


                    signupForm.reset();


                    setAuthMessage(
                        "signupMessage",
                        "Account created successfully. Please login.",
                        "success"
                    );


                    setTimeout(
                        function () {

                            showLogin();

                            document
                                .getElementById(
                                    "loginEmail"
                                )
                                .value = email;

                            document
                                .getElementById(
                                    "loginPassword"
                                )
                                .focus();

                        },
                        800
                    );


                } catch (error) {

                    setAuthMessage(
                        "signupMessage",
                        error.message,
                        "error"
                    );
                }

            }
        );
    }


    /* EXISTING LOGIN SESSION */

    const token =
        localStorage.getItem(
            "payopti_token"
        );

    const savedUser =
        localStorage.getItem(
            "payopti_user"
        );


    if (
        token &&
        savedUser
    ) {

        try {

            const user =
                JSON.parse(
                    savedUser
                );

            updateLoggedUser(
                user
            );

            hideAuthScreen();

            loadDashboard();

        } catch (error) {

            logout();
        }

    } else {

        showAuthScreen();
    }
}


/* =====================================================
   NAVIGATION
   ===================================================== */

function showSection(
    sectionId,
    clickedButton
) {

    document
        .querySelectorAll(".section")
        .forEach(
            section => {
                section.classList.remove(
                    "active-section"
                );
            }
        );


    const section =
        document.getElementById(
            sectionId
        );


    if (section) {

        section.classList.add(
            "active-section"
        );
    }


    document
        .querySelectorAll(".nav-item")
        .forEach(
            button => {
                button.classList.remove(
                    "active"
                );
            }
        );


    if (clickedButton) {

        clickedButton.classList.add(
            "active"
        );
    }


    const titles = {

        dashboard: "Dashboard",

        payables: "Payables",

        scenarios: "Payment Scenarios",

        cash: "Cash Projection",

        settings: "Settings"
    };


    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    if (pageTitle) {

        pageTitle.textContent =
            titles[sectionId] ||
            "PayOpti";
    }


    if (sectionId === "payables") {

        loadPayables();
    }


    if (sectionId === "scenarios") {

        loadScenarios();
    }


    if (sectionId === "cash") {

        loadCashProjection();
    }


    if (sectionId === "settings") {

        loadSettings();
    }
}


/* =====================================================
   DASHBOARD
   ===================================================== */

async function loadDashboard() {

    try {

        const result =
            await getJSON(
                "/api/optimize"
            );


        const settings =
            await getJSON(
                "/api/settings"
            );


        updateDashboardKPIs(
            result,
            settings
        );


        renderRecommendations(
            result.recommendations ||
            []
        );


        renderDashboardChart(
            result.recommendations ||
            [],
            settings
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );
    }
}


function updateDashboardKPIs(
    result,
    settings
) {

    const availableCash =
        Number(
            result.startingAvailableCash ||
            settings.available_cash ||
            0
        );


    const savings =
        Number(
            result.totalSavings || 0
        );


    const penalty =
        Number(
            result.totalPenaltyCost || 0
        );


    const endingCash =
        Number(
            result.projectedEndingCash || 0
        );


    const recommendations =
        result.recommendations ||
        [];


    setText(
        "availableCash",
        money(availableCash)
    );


    setText(
        "totalSavings",
        money(savings)
    );


    setText(
        "totalPenalty",
        money(penalty)
    );


    setText(
        "endingCash",
        money(endingCash)
    );


    setText(
        "invoiceCount",
        recommendations.length
    );


    setText(
        "plannedPayments",
        money(
            result.totalPayments || 0
        )
    );


    setText(
        "earlyPayments",
        recommendations.filter(
            item =>
                item.decision ===
                "PAY_EARLY"
        ).length
    );


    setText(
        "duePayments",
        recommendations.filter(
            item =>
                item.decision ===
                "PAY_ON_DUE_DATE"
        ).length
    );


    setText(
        "deferredPayments",
        recommendations.filter(
            item =>
                item.decision ===
                "DEFER"
        ).length
    );
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;
    }
}


/* =====================================================
   RECOMMENDATIONS
   ===================================================== */

function renderRecommendations(
    recommendations
) {

    const container =
        document.getElementById(
            "dashboardRecommendations"
        );


    if (!container) {
        return;
    }


    if (
        !recommendations ||
        recommendations.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No pending payment recommendations.
            </div>
        `;

        return;
    }


    container.innerHTML =
        recommendations
            .slice(0, 10)
            .map(item => {

                let badgeClass =
                    "blue";

                let decisionText =
                    "Pay on Due Date";


                if (
                    item.decision ===
                    "PAY_EARLY"
                ) {

                    badgeClass = "green";
                    decisionText =
                        "Pay Early";

                } else if (
                    item.decision ===
                    "DEFER"
                ) {

                    badgeClass = "red";
                    decisionText =
                        "Defer Payment";
                }


                return `
                    <div class="recommendation">

                        <div class="recommendation-header">

                            <div>

                                <div class="recommendation-title">
                                    ${escapeHtml(
                                        item.vendorName ||
                                        "Unknown Vendor"
                                    )}
                                </div>

                                <div class="recommendation-meta">
                                    Bill:
                                    ${escapeHtml(
                                        item.billNumber ||
                                        item.billId
                                    )}
                                    &nbsp; • &nbsp;
                                    Due:
                                    ${escapeHtml(
                                        item.dueDate
                                    )}
                                </div>

                            </div>

                            <span class="badge ${badgeClass}">
                                ${decisionText}
                            </span>

                        </div>


                        <div class="recommendation-reason">
                            ${escapeHtml(
                                item.reason ||
                                "Payment scheduled according to cash availability."
                            )}
                        </div>


                        <div class="recommendation-meta">

                            Payment:
                            ${money(
                                item.paymentAmount
                            )}

                            &nbsp; • &nbsp;

                            Savings:
                            ${money(
                                item.savings
                            )}

                            &nbsp; • &nbsp;

                            Penalty:
                            ${money(
                                item.penaltyCost
                            )}

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =====================================================
   DASHBOARD CHART
   ===================================================== */

function renderDashboardChart(
    recommendations,
    settings
) {

    const canvas =
        document.getElementById(
            "cashChart"
        );


    if (!canvas) {
        return;
    }


    const labels =
        recommendations.map(
            item =>
                item.billNumber ||
                item.billId
        );


    const cash =
        Number(
            settings.available_cash ||
            0
        );


    let currentCash = cash;


    const values =
        recommendations.map(
            item => {

                currentCash -=
                    Number(
                        item.paymentAmount ||
                        0
                    );

                return currentCash;
            }
        );


    if (cashChart) {

        cashChart.destroy();
    }


    cashChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Projected Cash",

                            data:
                                values,

                            borderWidth: 2,

                            tension: 0.3,

                            fill: false
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            ticks: {

                                callback:
                                    value =>
                                        money(value)
                            }

                        }

                    }

                }

            }
        );
}


/* =====================================================
   PAYABLES
   ===================================================== */

async function loadPayables() {

    const table =
        document.getElementById(
            "payablesTable"
        );


    if (!table) {
        return;
    }


    try {

        const data =
            await getJSON(
                "/api/purchase-bills"
            );


        allPayables =
            Array.isArray(data)
                ? data
                : (
                    data.data ||
                    data.bills ||
                    []
                );


        renderPayables(
            allPayables
        );


    } catch (error) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;
    }
}


function renderPayables(
    bills
) {

    const table =
        document.getElementById(
            "payablesTable"
        );


    if (!table) {
        return;
    }


    if (
        !bills ||
        bills.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No purchase bills found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        bills
            .map(
                bill => `
                    <tr>

                        <td>
                            ${escapeHtml(
                                bill.bill_number ||
                                bill.id
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                bill.vendor_name ||
                                bill.vendor_id ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${money(
                                bill.balance_due ||
                                bill.total_amount ||
                                bill.amount
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                bill.due_date ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                bill.status ||
                                "-"
                            )}
                        </td>

                    </tr>
                `
            )
            .join("");
}


function filterPayables() {

    const search =
        document
            .getElementById(
                "payablesSearch"
            )
            .value
            .toLowerCase()
            .trim();


    const filtered =
        allPayables.filter(
            bill => {

                const text =
                    `${bill.bill_number || ""} ${
                        bill.vendor_name || ""
                    } ${
                        bill.vendor_id || ""
                    }`.toLowerCase();


                return text.includes(
                    search
                );
            }
        );


    renderPayables(
        filtered
    );
}


/* =====================================================
   SCENARIOS
   ===================================================== */

async function loadScenarios() {

    const container =
        document.getElementById(
            "scenarioCards"
        );


    if (!container) {
        return;
    }


    try {

        const data =
            await getJSON(
                "/api/scenarios"
            );


        allScenarios =
            Array.isArray(data)
                ? data
                : (
                    data.scenarios ||
                    data.data ||
                    []
                );


        renderScenarios(
            allScenarios
        );


    } catch (error) {

        container.innerHTML = `
            <div class="empty-state">
                ${escapeHtml(
                    error.message
                )}
            </div>
        `;
    }
}


function renderScenarios(
    scenarios
) {

    const container =
        document.getElementById(
            "scenarioCards"
        );


    if (
        !scenarios ||
        scenarios.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No scenarios available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        scenarios
            .map(
                item => {

                    const scenariosData =
                        item.scenarios ||
                        {};


                    const early =
                        scenariosData.early ||
                        {};


                    const due =
                        scenariosData.dueDate ||
                        {};


                    const late =
                        scenariosData.late ||
                        {};


                    return `
                        <div class="scenario-card">

                            <h3>
                                ${escapeHtml(
                                    item.vendorName ||
                                    "Vendor"
                                )}
                            </h3>

                            <p>
                                ${escapeHtml(
                                    item.billNumber ||
                                    item.billId
                                )}
                            </p>


                            <div class="scenario-value">
                                ${money(
                                    item.originalAmount
                                )}
                            </div>


                            <div class="scenario-row">

                                <span>
                                    Early Payment
                                </span>

                                <strong>
                                    ${money(
                                        early.paymentAmount
                                    )}
                                </strong>

                            </div>


                            <div class="scenario-row">

                                <span>
                                    Discount Saved
                                </span>

                                <strong>
                                    ${money(
                                        early.discountSaved
                                    )}
                                </strong>

                            </div>


                            <div class="scenario-row">

                                <span>
                                    Due Date
                                </span>

                                <strong>
                                    ${money(
                                        due.paymentAmount
                                    )}
                                </strong>

                            </div>


                            <div class="scenario-row">

                                <span>
                                    Late Payment
                                </span>

                                <strong>
                                    ${money(
                                        late.paymentAmount
                                    )}
                                </strong>

                            </div>


                            <div class="scenario-row">

                                <span>
                                    Late Penalty
                                </span>

                                <strong>
                                    ${money(
                                        late.penaltyCost
                                    )}
                                </strong>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =====================================================
   CASH PROJECTION
   ===================================================== */

async function loadCashProjection() {

    try {

        const result =
            await getJSON(
                "/api/optimize"
            );


        const settings =
            await getJSON(
                "/api/settings"
            );


        renderCashProjection(
            result,
            settings
        );


    } catch (error) {

        console.error(
            "Cash projection error:",
            error
        );
    }
}


function renderCashProjection(
    result,
    settings
) {

    const canvas =
        document.getElementById(
            "cashProjectionChart"
        );


    if (!canvas) {
        return;
    }


    const recommendations =
        result.recommendations ||
        [];


    let currentCash =
        Number(
            settings.available_cash ||
            result.startingAvailableCash ||
            0
        );


    const labels = ["Starting"];

    const values = [currentCash];


    recommendations.forEach(
        item => {

            currentCash -=
                Number(
                    item.paymentAmount ||
                    0
                );


            labels.push(
                item.billNumber ||
                item.billId
            );


            values.push(
                currentCash
            );
        }
    );


    if (cashProjectionChart) {

        cashProjectionChart.destroy();
    }


    cashProjectionChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Projected Cash",

                            data:
                                values,

                            borderWidth: 2,

                            tension: 0.3,

                            fill: false
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            ticks: {

                                callback:
                                    value =>
                                        money(value)
                            }

                        }

                    }

                }

            }
        );


    const summary =
        document.getElementById(
            "cashProjectionSummary"
        );


    if (summary) {

        summary.innerHTML = `

            <div class="kpi-card">

                <div class="kpi-icon blue">
                    ₹
                </div>

                <div>

                    <span>
                        Starting Cash
                    </span>

                    <strong>
                        ${money(
                            result.startingAvailableCash
                        )}
                    </strong>

                </div>

            </div>


            <div class="kpi-card">

                <div class="kpi-icon green">
                    ₹
                </div>

                <div>

                    <span>
                        Ending Cash
                    </span>

                    <strong>
                        ${money(
                            result.projectedEndingCash
                        )}
                    </strong>

                </div>

            </div>


            <div class="kpi-card">

                <div class="kpi-icon orange">
                    ₹
                </div>

                <div>

                    <span>
                        Minimum Reserve
                    </span>

                    <strong>
                        ${money(
                            result.minimumReserve
                        )}
                    </strong>

                </div>

            </div>

        `;
    }
}


/* =====================================================
   SETTINGS
   ===================================================== */

async function loadSettings() {

    try {

        await loadVendors();

        await loadPaymentTerms();

    } catch (error) {

        console.error(
            "Settings error:",
            error
        );
    }
}


async function loadVendors() {

    const select =
        document.getElementById(
            "termVendorId"
        );


    if (!select) {
        return;
    }


    const data =
        await getJSON(
            "/api/vendors"
        );


    const vendors =
        Array.isArray(data)
            ? data
            : (
                data.vendors ||
                data.data ||
                []
            );


    select.innerHTML =
        `<option value="">
            Select Vendor
        </option>`;


    vendors.forEach(
        vendor => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                vendor.id;


            option.textContent =
                vendor.name;


            select.appendChild(
                option
            );
        }
    );
}


async function loadPaymentTerms() {

    const table =
        document.getElementById(
            "paymentTermsTable"
        );


    if (!table) {
        return;
    }


    const data =
        await getJSON(
            "/api/payment-terms"
        );


    const terms =
        Array.isArray(data)
            ? data
            : (
                data.terms ||
                data.data ||
                []
            );


    if (!terms.length) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No payment terms configured.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        terms
            .map(
                term => `
                    <tr>

                        <td>
                            ${escapeHtml(
                                term.vendor_name ||
                                term.vendor_id
                            )}
                        </td>

                        <td>
                            ${Number(
                                term.early_discount_percent ||
                                0
                            )}%
                        </td>

                        <td>
                            ${Number(
                                term.early_payment_days ||
                                0
                            )}
                        </td>

                        <td>
                            ${Number(
                                term.late_penalty_percent ||
                                0
                            )}%
                        </td>

                        <td>
                            ${Number(
                                term.late_payment_days ||
                                0
                            )}
                        </td>

                    </tr>
                `
            )
            .join("");
}


/* =====================================================
   SAVE PAYMENT TERMS
   ===================================================== */

async function savePaymentTerms() {

    const vendorId =
        document.getElementById(
            "termVendorId"
        ).value;


    const earlyDiscount =
        document.getElementById(
            "earlyDiscount"
        ).value;


    const earlyDays =
        document.getElementById(
            "earlyDays"
        ).value;


    const latePenalty =
        document.getElementById(
            "latePenalty"
        ).value;


    const lateDays =
        document.getElementById(
            "lateDays"
        ).value;


    if (!vendorId) {

        alert(
            "Please select a vendor."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/payment-terms`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        vendor_id:
                            vendorId,

                        early_discount_percent:
                            Number(
                                earlyDiscount ||
                                0
                            ),

                        early_payment_days:
                            Number(
                                earlyDays ||
                                0
                            ),

                        late_penalty_percent:
                            Number(
                                latePenalty ||
                                0
                            ),

                        late_payment_days:
                            Number(
                                lateDays ||
                                0
                            )

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Unable to save payment terms."
            );
        }


        alert(
            "Payment terms saved successfully."
        );


        document.getElementById(
            "termVendorId"
        ).value = "";


        document.getElementById(
            "earlyDiscount"
        ).value = "";


        document.getElementById(
            "earlyDays"
        ).value = "";


        document.getElementById(
            "latePenalty"
        ).value = "";


        document.getElementById(
            "lateDays"
        ).value = "";


        await loadPaymentTerms();

        await loadDashboard();


    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =====================================================
   START
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeAuthentication();

    }
);