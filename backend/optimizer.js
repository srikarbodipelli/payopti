// ============================================================
// PAYOPTI - SMART PAYMENT OPTIMIZER
// ============================================================

function round(value) {
    return Number(Number(value || 0).toFixed(2));
}


// ------------------------------------------------------------
// DATE HELPERS
// ------------------------------------------------------------

function formatDate(date) {
    return date.toISOString().split("T")[0];
}


function addDays(dateString, days) {
    const date = new Date(`${dateString}T00:00:00`);

    date.setDate(
        date.getDate() + Number(days || 0)
    );

    return formatDate(date);
}


function today() {
    const date = new Date();

    return formatDate(date);
}


// ------------------------------------------------------------
// Calculate all payment scenarios for one bill
// ------------------------------------------------------------

function calculateScenarios(bill) {

    const amount = Number(
        bill.balance_due ||
        bill.total_amount ||
        bill.amount ||
        0
    );

    const terms =
        bill.paymentTerms || {};


    const discountPercent =
        Number(
            terms.early_discount_percent || 0
        );


    const earlyPaymentDays =
        Number(
            terms.early_payment_days || 0
        );


    const penaltyPercent =
        Number(
            terms.late_penalty_percent || 0
        );


    const latePaymentDays =
        Number(
            terms.late_payment_days || 0
        );


    const dueDate =
        bill.due_date;


    // --------------------------------------------------------
    // EARLY PAYMENT
    // --------------------------------------------------------

    const calculatedEarlyDate =
        addDays(
            dueDate,
            -earlyPaymentDays
        );


    const discountSaved =
        amount *
        discountPercent /
        100;


    const earlyAmount =
        amount -
        discountSaved;


    // An early-payment option is valid only if
    // the discount deadline has not already passed.
    const earlyAvailable =
        calculatedEarlyDate >= today();


    // --------------------------------------------------------
    // DUE DATE PAYMENT
    // --------------------------------------------------------

    const dueAmount =
        amount;


    // --------------------------------------------------------
    // LATE PAYMENT
    // --------------------------------------------------------

    const lateDate =
        addDays(
            dueDate,
            latePaymentDays
        );


    const penaltyCost =
        amount *
        penaltyPercent /
        100;


    const lateAmount =
        amount +
        penaltyCost;


    return {

        billId:
            bill.id,

        billNumber:
            bill.bill_number,

        vendorId:
            bill.vendor_id,

        vendorName:
            bill.vendor_name,

        originalAmount:
            round(amount),

        dueDate,

        scenarios: {

            early: {

                paymentDate:
                    calculatedEarlyDate,

                paymentAmount:
                    round(earlyAmount),

                discountPercent,

                discountSaved:
                    round(discountSaved),

                penaltyCost:
                    0,

                cashImpact:
                    round(earlyAmount),

                available:
                    earlyAvailable

            },


            dueDate: {

                paymentDate:
                    dueDate,

                paymentAmount:
                    round(dueAmount),

                discountPercent:
                    0,

                discountSaved:
                    0,

                penaltyCost:
                    0,

                cashImpact:
                    round(dueAmount),

                available:
                    true

            },


            late: {

                paymentDate:
                    lateDate,

                paymentAmount:
                    round(lateAmount),

                discountPercent:
                    0,

                discountSaved:
                    0,

                penaltyPercent,

                penaltyCost:
                    round(penaltyCost),

                cashImpact:
                    round(lateAmount),

                available:
                    true

            }

        }

    };
}


// ------------------------------------------------------------
// SMART DECISION
// ------------------------------------------------------------

function chooseBestScenario(
    scenarios,
    remainingCash,
    minimumReserve
) {

    const early =
        scenarios.scenarios.early;

    const due =
        scenarios.scenarios.dueDate;

    const late =
        scenarios.scenarios.late;


    // Cash that can safely be used while
    // maintaining the minimum reserve.
    const usableCash =
        Math.max(
            0,
            Number(remainingCash) -
            Number(minimumReserve)
        );


    // --------------------------------------------------------
    // 1. EARLY PAYMENT
    // --------------------------------------------------------

    if (
        early.available &&
        early.discountSaved > 0 &&
        early.cashImpact <= usableCash
    ) {

        return {

            decision:
                "PAY_EARLY",

            scheduledDate:
                early.paymentDate,

            paymentAmount:
                early.paymentAmount,

            savings:
                early.discountSaved,

            penaltyCost:
                0,

            reason:
                `Pay early to capture ${early.discountPercent}% ` +
                `discount and save ₹${early.discountSaved.toFixed(2)}.`

        };
    }


    // --------------------------------------------------------
    // 2. DUE DATE PAYMENT
    // --------------------------------------------------------

    if (
        due.cashImpact <=
        usableCash
    ) {

        return {

            decision:
                "PAY_ON_DUE_DATE",

            scheduledDate:
                due.paymentDate,

            paymentAmount:
                due.paymentAmount,

            savings:
                0,

            penaltyCost:
                0,

            reason:
                "Pay on the due date to preserve cash until the payment deadline."

        };
    }


    // --------------------------------------------------------
    // 3. DEFER / LATE PAYMENT
    // --------------------------------------------------------

    return {

        decision:
            "DEFER",

        scheduledDate:
            late.paymentDate,

        paymentAmount:
            late.paymentAmount,

        savings:
            0,

        penaltyCost:
            late.penaltyCost,

        reason:
            `Defer payment because available cash is insufficient ` +
            `to pay while maintaining the minimum reserve. ` +
            `Estimated late cost: ₹${late.penaltyCost.toFixed(2)}.`

    };
}


// ------------------------------------------------------------
// MAIN OPTIMIZER
// ------------------------------------------------------------

function optimizeBills(
    bills,
    availableCash,
    minimumReserve
) {

    let remainingCash =
        Number(availableCash);


    const startingCash =
        Number(availableCash);


    const reserve =
        Number(minimumReserve);


    const recommendations = [];


    let totalSavings =
        0;


    let totalPenaltyCost =
        0;


    let totalPayments =
        0;


    // --------------------------------------------------------
    // Sort invoices by due date
    // --------------------------------------------------------

    const sortedBills =
        [...bills].sort(
            (a, b) =>
                new Date(a.due_date) -
                new Date(b.due_date)
        );


    // --------------------------------------------------------
    // Process every bill
    // --------------------------------------------------------

    for (
        const bill of sortedBills
    ) {

        const scenarios =
            calculateScenarios(
                bill
            );


        const decision =
            chooseBestScenario(
                scenarios,
                remainingCash,
                reserve
            );


        // ----------------------------------------------------
        // Every selected payment is a planned cash outflow.
        // This includes deferred/late payments.
        // ----------------------------------------------------

        remainingCash -=
            Number(
                decision.paymentAmount || 0
            );


        totalPayments +=
            Number(
                decision.paymentAmount || 0
            );


        totalSavings +=
            Number(
                decision.savings || 0
            );


        totalPenaltyCost +=
            Number(
                decision.penaltyCost || 0
            );


        recommendations.push({

            billId:
                bill.id,

            billNumber:
                bill.bill_number,

            vendorId:
                bill.vendor_id,

            vendorName:
                bill.vendor_name,

            amount:
                scenarios.originalAmount,

            dueDate:
                bill.due_date,

            scheduledDate:
                decision.scheduledDate,

            decision:
                decision.decision,

            paymentAmount:
                round(
                    decision.paymentAmount
                ),

            savings:
                round(
                    decision.savings
                ),

            penaltyCost:
                round(
                    decision.penaltyCost
                ),

            reason:
                decision.reason,

            scenarios:
                scenarios.scenarios

        });

    }


    // --------------------------------------------------------
    // FINAL RESULT
    // --------------------------------------------------------

    return {

        startingAvailableCash:
            round(startingCash),

        minimumReserve:
            round(reserve),

        totalPayments:
            round(totalPayments),

        totalSavings:
            round(totalSavings),

        totalPenaltyCost:
            round(totalPenaltyCost),

        projectedEndingCash:
            round(remainingCash),

        reserveMaintained:
            remainingCash >= reserve,

        recommendations

    };
}


// ------------------------------------------------------------
// EXPORT
// ------------------------------------------------------------

module.exports = {

    calculateScenarios,

    optimizeBills

};