const axios = require("axios");

async function getWeather(location){
    const response = await axios.get("http://api.weatherstack.com/current", {
        params: {
            access_key: process.env.WEATHERSTACK_KEY,
            query: location,
            units: "f"
        }
    });

    if(response.data.error) {
        throw new Error(response.data.error.info);
    }

    const current = response.data.current;
    const description = current.weather_descriptions[0];
    const temperature = current.temperature;
    const icon = current.weather_icons[0];

    const niceWeather = ["sunny", "clear", "partly cloudy", "cloudy"];

    const niceToGoOut = niceWeather.some(word =>
        description.toLowerCase().includes(word)
    ) && temperature >= 45 && temperature <= 90;

    return {
        location: response.data.location.name,
        description,
        temperature,
        icon,
        niceToGoOut
    };
}
module.exports = {getWeather};