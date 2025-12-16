const axios = require("axios");
const qs = require("qs");

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
                search_expression: "recipe",
                max_results: 10,
                format: "json"
            }
        }
    );
const foods = response.data.foods.food;

    // Find closest calorie matches
    const withCalories = foods
        .map(f => {
            const calories = parseInt(f.food_description.match(/Calories:\s*(\d+)/)?.[1]);
            return calories ? {...f, calories } : null;
        })
        .filter(Boolean);

    withCalories.sort(
        (a, b) =>
            Math.abs(a.calories - targetCalories) -
            Math.abs(b.calories - targetCalories)
    );

    return withCalories.slice(0, 2);
}

module.exports = {searchCalories};