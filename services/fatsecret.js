const axios = require("axios");
const qs = require("qs");

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * This was the most annoying api that I could choose to work with in one day. 
 * the main thing that stopped me and made me pivot to weather was the whitelist
 * Not only do we have to pay to allow for any IP address to call the api
 * but learning and figuring out the data structure and using it was a headache.
 */





async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const response = await axios.post(
        "https://oauth.fatsecret.com/connect/token",
        qs.stringify({ grant_type: "client_credentials" }),
        {
            auth: {
                username: process.env.FATSECRET_CLIENT_ID,
                password: process.env.FATSECRET_CLIENT_SECRET
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );

    cachedToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);

    return cachedToken;
}

async function searchCalories(targetCalories) {
    const token = await getAccessToken();

    const response = await axios.get(
        "https://platform.fatsecret.com/rest/server.api",
        {
            headers: {Authorization: `Bearer ${token}` },
            params: {
                method: "foods.search",
                search_expression: "chicken",
                max_results: 10,
                format: "json"
            }
        }
    );

    if (response.data.error) {
            console.error("FatSecret error:", response.data.error);
            return [];
    }

    const raw = response.data?.recipes?.recipe;

    if (!raw) return [];

    const recipes = Array.isArray(raw) ? raw : [raw];

    // Find closest calorie matches
    const parsed = foods
        .map(f => {
            const match = f.food_description?.match(/Calories:\s*(\d+)/);
            if (!match) return null;

            return {
                name: f.food_name,
                description: f.food_description,
                calories: Number(match[1]),
                image: f.food_image || null
            };
        })
        .filter(Boolean);

    parsed.sort(
    (a, b) =>
        Math.abs(a.calories - targetCalories) -
        Math.abs(b.calories - targetCalories)
    );

    return parsed.slice(0, 3);
}

module.exports = {searchCalories};