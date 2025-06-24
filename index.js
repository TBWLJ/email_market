require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const profileRouter = require("./routes/profile");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/profile", profileRouter);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch(err => console.error(err));
