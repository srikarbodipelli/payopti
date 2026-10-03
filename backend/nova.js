require("dotenv").config();

const NOVA_BASE_URL = process.env.NOVA_BASE_URL;
const NOVA_API_KEY = process.env.NOVA_API_KEY;

async function novaRequest(endpoint) {
    const response = await fetch(
        `${NOVA_BASE_URL}${endpoint}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${NOVA_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    const data = await response.text();

    if (!response.ok) {
        throw new Error(
            `Nova API error ${response.status}: ${data}`
        );
    }

    return JSON.parse(data);
}

module.exports = { novaRequest };