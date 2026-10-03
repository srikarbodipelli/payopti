const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./db");
const { novaRequest } = require("./nova");
const { optimizeBills } = require("./optimizer");

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET =
    process.env.JWT_SECRET || "payopti_hackathon_secret_2026";


// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    const token =
        authHeader &&
        authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

    if (!token) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    jwt.verify(
        token,
        JWT_SECRET,
        (err, user) => {

            if (err) {
                return res.status(403).json({
                    error: "Invalid or expired token"
                });
            }

            req.user = user;

            next();
        }
    );
}


// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {

    res.json({
        message: "PayOpti API is running 🚀"
    });

});


// ============================================================
// REGISTER USER
// ============================================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                error:
                    "Name, email and password are required"
            });

        }

        if (password.length < 6) {

            return res.status(400).json({
                error:
                    "Password must contain at least 6 characters"
            });

        }

        const normalizedEmail =
            email.trim().toLowerCase();

        db.query(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail],
            async (err, results) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error:
                            "Failed to check user"
                    });

                }

                if (results.length > 0) {

                    return res.status(409).json({
                        error:
                            "Email already registered"
                    });

                }

                const passwordHash =
                    await bcrypt.hash(
                        password,
                        10
                    );

                db.query(
                    `
                    INSERT INTO users
                    (name, email, password_hash, role)
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        name.trim(),
                        normalizedEmail,
                        passwordHash,
                        "Finance User"
                    ],
                    (insertError, result) => {

                        if (insertError) {

                            console.error(
                                insertError
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to create user"
                            });

                        }

                        res.status(201).json({

                            message:
                                "Account created successfully",

                            userId:
                                result.insertId

                        });

                    }
                );

            }
        );

    } catch (error) {

        console.error(
            "Registration error:",
            error.message
        );

        res.status(500).json({
            error:
                "Registration failed"
        });

    }

});


// ============================================================
// LOGIN
// ============================================================

app.post("/api/login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            error:
                "Email and password are required"
        });

    }

    const normalizedEmail =
        email.trim().toLowerCase();

    db.query(
        `
        SELECT
            id,
            name,
            email,
            password_hash,
            role
        FROM users
        WHERE email = ?
        `,
        [normalizedEmail],
        async (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error:
                        "Login failed"
                });

            }

            if (results.length === 0) {

                return res.status(401).json({
                    error:
                        "Invalid email or password"
                });

            }

            const user =
                results[0];

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!passwordMatch) {

                return res.status(401).json({
                    error:
                        "Invalid email or password"
                });

            }

            const token =
                jwt.sign(
                    {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "8h"
                    }
                );

            res.json({

                message:
                    "Login successful",

                token,

                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }

            });

        }
    );

});


// ============================================================
// CURRENT USER
// ============================================================

app.get(
    "/api/me",
    authenticateToken,
    (req, res) => {

        res.json({
            user: req.user
        });

    }
);


// ============================================================
// GET VENDORS
// ============================================================

app.get(
    "/api/vendors",
    authenticateToken,
    (req, res) => {

        db.query(
            "SELECT * FROM vendors",
            (err, results) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error:
                            "Failed to fetch vendors"
                    });

                }

                res.json(results);

            }
        );

    }
);


// ============================================================
// GET COMPANY SETTINGS
// ============================================================

app.get(
    "/api/settings",
    authenticateToken,
    (req, res) => {

        db.query(
            "SELECT * FROM company_settings WHERE id = 1",
            (err, results) => {

                if (err) {

                    return res.status(500).json({
                        error:
                            "Failed to fetch settings"
                    });

                }

                res.json(results[0]);

            }
        );

    }
);


// ============================================================
// GET PURCHASE BILLS FROM NOVA
// ============================================================

app.get(
    "/api/purchase-bills",
    authenticateToken,
    async (req, res) => {

        try {

            const data =
                await novaRequest(
                    "/purchase-bills?limit=100"
                );

            res.json(data);

        } catch (error) {

            console.error(
                "Nova purchase bills error:",
                error.message
            );

            res.status(500).json({
                error:
                    "Failed to fetch purchase bills"
            });

        }

    }
);


// ============================================================
// GET VENDOR PAYMENT TERMS
// ============================================================

app.get(
    "/api/payment-terms",
    authenticateToken,
    (req, res) => {

        db.query(
            "SELECT * FROM vendor_payment_terms",
            (err, results) => {

                if (err) {

                    console.error(
                        "Payment terms error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch payment terms"
                    });

                }

                res.json(results);

            }
        );

    }
);


// ============================================================
// ADD / UPDATE VENDOR PAYMENT TERMS
// ============================================================

app.post(
    "/api/payment-terms",
    authenticateToken,
    (req, res) => {

        const {
            vendor_id,
            early_discount_percent,
            early_payment_days,
            late_penalty_percent,
            late_payment_days
        } = req.body;

        if (!vendor_id) {

            return res.status(400).json({
                error:
                    "vendor_id is required"
            });

        }

        const sql = `
            INSERT INTO vendor_payment_terms
            (
                vendor_id,
                early_discount_percent,
                early_payment_days,
                late_penalty_percent,
                late_payment_days
            )
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                early_discount_percent =
                    VALUES(early_discount_percent),

                early_payment_days =
                    VALUES(early_payment_days),

                late_penalty_percent =
                    VALUES(late_penalty_percent),

                late_payment_days =
                    VALUES(late_payment_days)
        `;

        db.query(
            sql,
            [
                vendor_id,
                Number(
                    early_discount_percent || 0
                ),
                Number(
                    early_payment_days || 0
                ),
                Number(
                    late_penalty_percent || 0
                ),
                Number(
                    late_payment_days || 0
                )
            ],
            (err) => {

                if (err) {

                    console.error(
                        "Saving payment terms error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to save payment terms"
                    });

                }

                res.json({

                    message:
                        "Payment terms saved successfully",

                    vendor_id

                });

            }
        );

    }
);


// ============================================================
// PAYMENT OPTIMIZATION
// ============================================================

app.get(
    "/api/optimize",
    authenticateToken,
    async (req, res) => {

        try {

            const novaData =
                await novaRequest(
                    "/purchase-bills?limit=100"
                );

            db.query(
                "SELECT * FROM company_settings WHERE id = 1",
                (err, settings) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            error:
                                "Failed to fetch company settings"
                        });

                    }

                    if (
                        !settings ||
                        settings.length === 0
                    ) {

                        return res.status(404).json({
                            error:
                                "Company settings not found"
                        });

                    }

                    const setting =
                        settings[0];

                    const availableCash =
                        Number(
                            setting.available_cash
                        );

                    const minimumReserve =
                        Number(
                            setting.minimum_cash_reserve
                        );

                    db.query(
                        "SELECT * FROM vendor_payment_terms",
                        (termsError, terms) => {

                            if (termsError) {

                                console.error(
                                    termsError
                                );

                                return res.status(500).json({
                                    error:
                                        "Failed to fetch payment terms"
                                });

                            }

                            const termsMap = {};

                            terms.forEach(
                                term => {

                                    termsMap[
                                        term.vendor_id
                                    ] = term;

                                }
                            );

                            const pendingBills =
                                (novaData.data || [])
                                    .filter(
                                        bill =>
                                            bill.status ===
                                                "pending" &&
                                            Number(
                                                bill.balance_due ||
                                                bill.total_amount ||
                                                0
                                            ) > 0
                                    )
                                    .sort(
                                        (a, b) =>
                                            new Date(
                                                a.due_date
                                            ) -
                                            new Date(
                                                b.due_date
                                            )
                                    );

                            const billsWithTerms =
                                pendingBills.map(
                                    bill => ({

                                        ...bill,

                                        paymentTerms:
                                            termsMap[
                                                bill.vendor_id
                                            ] || {

                                                early_discount_percent:
                                                    0,

                                                early_payment_days:
                                                    0,

                                                late_penalty_percent:
                                                    0,

                                                late_payment_days:
                                                    0

                                            }

                                    })
                                );

                            const result =
                                optimizeBills(
                                    billsWithTerms,
                                    availableCash,
                                    minimumReserve
                                );

                            res.json(result);

                        }
                    );

                }
            );

        } catch (error) {

            console.error(
                "Optimization error:",
                error.message
            );

            res.status(500).json({
                error:
                    "Failed to optimize payments"
            });

        }

    }
);


// ============================================================
// PAYMENT SCENARIO SIMULATION
// ============================================================

app.get(
    "/api/scenarios",
    authenticateToken,
    async (req, res) => {

        try {

            const novaData =
                await novaRequest(
                    "/purchase-bills?limit=100"
                );

            db.query(
                "SELECT * FROM vendor_payment_terms",
                (termsError, terms) => {

                    if (termsError) {

                        return res.status(500).json({
                            error:
                                "Failed to fetch payment terms"
                        });

                    }

                    const termsMap = {};

                    terms.forEach(
                        term => {

                            termsMap[
                                term.vendor_id
                            ] = term;

                        }
                    );

                    const pendingBills =
                        (novaData.data || [])
                            .filter(
                                bill =>
                                    bill.status ===
                                        "pending" &&
                                    Number(
                                        bill.balance_due ||
                                        0
                                    ) > 0
                            );

                    const {
                        calculateScenarios
                    } = require("./optimizer");

                    const scenarios =
                        pendingBills.map(
                            bill => {

                                const billWithTerms = {

                                    ...bill,

                                    paymentTerms:
                                        termsMap[
                                            bill.vendor_id
                                        ] || {

                                            early_discount_percent:
                                                0,

                                            early_payment_days:
                                                0,

                                            late_penalty_percent:
                                                0,

                                            late_payment_days:
                                                0

                                        }

                                };

                                return calculateScenarios(
                                    billWithTerms
                                );

                            }
                        );

                    res.json({

                        totalBills:
                            scenarios.length,

                        scenarios

                    });

                }
            );

        } catch (error) {

            console.error(
                "Scenario error:",
                error.message
            );

            res.status(500).json({
                error:
                    "Failed to calculate payment scenarios"
            });

        }

    }
);


// ============================================================
// START SERVER
// ============================================================

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 PayOpti server running at http://localhost:${PORT}`
        );

    }
);