const axios = require("axios");
const qs = require("qs");

let cachedToken = null;
let tokenExpiresAt = 0;

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
                method: "recipes.search",
                search_expression: "recipe",
                max_results: 10,
                format: "json"
            }
        }
    );

    if (response.data.error) {
            console.error("FatSecret error:", response.data.error);
            return [];
    }

    const foods = response.data.foods.food;

    const raw = response.data?.recipes?.recipe;
    if (!raw) return [];

    const recipes = Array.isArray(raw) ? raw : [raw];

    // Find closest calorie matches
    const withCalories = recipes
        .map(r => ({
            id: r.recipe_id,
            name: r.recipe_name,
            calories: parseInt(r.recipe_calories),
            image: r.recipe_image,
            description: r.recipe_description
        }))
        .filter(r => !isNaN(r.calories));

    withCalories.sort(
        (a, b) =>
            Math.abs(a.calories - targetCalories) -
            Math.abs(b.calories - targetCalories)
    );

    return withCalories.slice(0, 3);
}

module.exports = {searchCalories};