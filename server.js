const path = require("path");

// require("dotenv").config({
//     path: path.resolve(__dirname, "credentialsDontPost/settings.env"),
// });

const mongoose = require("mongoose");
const express = require("express");
const app = express();
const portNumber = process.env.PORT || 6767;

const {searchCalories} = require("./services/fatsecret")

/* Middleware */
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
/* Set up EJS */
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));

/* Connect to MongoDB */
mongoose.connect(process.env.MONGO_CONNECTION_STRING)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

/* Home page */
app.get("/", (request, response) => {
    response.render("index");
});

/* Search page */
app.get("/search", (request, response) => {
    response.render("search", { searchResults: null });
});
/* Search users by name */
app.post("/search", async (request, response) => {
    try {
        const User = require('./model/User');
        const { searchName } = request.body;
        const searchResults = await User.find({ name: searchName });

        const foodMatches = {
            lose05: await searchCalories(results.lose05),
            lose1: await searchCalories(results.lose1),
            gain05: await searchCalories(results.gain05),
            gain1: await searchCalories(results.gain1)
        };
        
        response.render("search", {searchResults, foodMatches });
    } catch (err) {
        console.error(err);
        response.send("Error: " + err.message);
    }
});
/* View user information */
app.get("/user/:userId", async (request, response) => {
    try {
        const User = require('./model/User');
        const userId = request.params.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return response.send("User not found");
        }
        
        /* Calculate calories for this user. I am using the Mifflin-St Jeor equation 
        I found online but if you guys want to change it to something else, feel free to do so. */
        const weightKg = user.weight * 0.453592;
        const heightCm = user.height * 2.54;
        let bmr;
        if (user.gender === "male") {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * user.age) + 5;
        } else {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * user.age) - 161;
        }
        
        const activityFactors = {
            "sedentary": 1.2,
            "lightly": 1.375,
            "moderately": 1.55,
            "very": 1.725,
            "extremely": 1.9
        };
        const tdee = bmr * activityFactors[user.activityLevel];
        
        const results = {
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            lose05: Math.round(tdee - 250),
            lose1: Math.round(tdee - 500),
            gain05: Math.round(tdee + 250),
            gain1: Math.round(tdee + 500)
        };
        
        /* Calculate feet and inches from stored height */
        user.heightFeet = Math.floor(user.height / 12);
        user.heightInches = user.height % 12;
        
        response.render("result", { user, results });
    } catch (err) {
        console.error(err);
        response.send("Error: " + err.message);
    }
});

/* Delete single user */
app.post("/delete/:userId", async (request, response) => {
    try {
        const User = require('./model/User');
        const userId = request.params.userId;
        await User.findByIdAndDelete(userId);
        response.redirect("/search");
    } catch (err) {
        console.error(err);
        response.send("Error: " + err.message);
    }
});

/* Delete all users */
app.post("/deleteAll", async (request, response) => {
    try {
        const User = require('./model/User');
        await User.deleteMany({});
        response.redirect("/search");
    } catch (err) {
        console.error(err);
        response.send("Error: " + err.message);
    }
});

/* Form submission handler */
app.post("/calculate", async (request, response) => {
    try {
        const User = require('./model/User');
        
        const { name, email, gender, age, feet, inches, weight, activityLevel } = request.body;
        
        /* Convert feet and inches to total inches */
        const totalInches = (Number(feet) * 12) + Number(inches);
        
        /* Create or update user */
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                name,
                email,
                gender,
                age: Number(age),
                height: totalInches,
                weight: Number(weight),
                activityLevel
            });
        } else {
            /* Update user information (their email is the unique identifier)*/
            user.name = name;
            user.gender = gender;
            user.age = Number(age);
            user.height = totalInches;
            user.weight = Number(weight);
            user.activityLevel = activityLevel;
            await user.save();
        }
        
        /* Calculate BMR(Basal Metabolic Rate) */
        const weightKg = weight * 0.453592;
        const heightCm = totalInches * 2.54;
        let bmr;
        if (gender === "male") {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        } else {
            bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        }
        
        /* Calculate TDEE(Total Daily Energy Expenditure) */
        const activityFactors = {
            "sedentary": 1.2,
            "lightly": 1.375,
            "moderately": 1.55,
            "very": 1.725,
            "extremely": 1.9
        };
        const tdee = bmr * activityFactors[activityLevel];
        
        /* Calculate all scenarios */
        const results = {
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            lose05: Math.round(tdee - 250),
            lose1: Math.round(tdee - 500),
            gain05: Math.round(tdee + 250),
            gain1: Math.round(tdee + 500)
        };
        
        /* Add feet and inches to user object for display */
        user.heightFeet = Number(feet);
        user.heightInches = Number(inches);
        
        const foodMatches = {
            lose05: await searchCalories(results.lose05),
            lose1: await searchCalories(results.lose1),
            gain05: await searchCalories(results.gain05),
            gain1: await searchCalories(results.gain1)
        };


        /* Redirect to results page */
        response.render("result", { user, results, foodMatches });

    } catch (err) {
        console.error(err);
        response.send("Error: " + err.message);
    }
});

app.listen(portNumber);
console.log(`Web server started at http://localhost:${portNumber}`);
