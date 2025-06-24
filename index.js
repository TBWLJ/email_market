require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const profileRouter = require("./routes/profile");

const app = express();

// cors middleware
app.use(cors({
  origin: "https://email-market-frontend.vercel.app",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


mongoose
.connect(process.env.MONGODB_URI)
.then(() => {
  console.log("MongoDB connected");
})
.catch(err => console.error(err));

app.use("/api/profile", profileRouter);

app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);