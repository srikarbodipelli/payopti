const { novaRequest } = require("./nova");

async function testNova() {
    try {
        const data = await novaRequest("/invoices?limit=5");

        console.log("✅ Nova API connected!");
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("❌ Nova error:", error.message);
    }
}

testNova();