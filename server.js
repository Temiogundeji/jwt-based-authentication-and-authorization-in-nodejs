const express = require("express");
const cors = require("cors");
const db = require("./app/models");
const dbConfig = require("./app/config/db.config");
const Role = db.role;

const app = express();

var corsOptions = {
  origin: "http://localhost:8081",
};

app.use(cors(corsOptions));

mongodb: db.mongoose
  .connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
    initialize();
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

function initialize() {
  Role.estimatedDocumentCount({})
    .then((count) => {
      // Use the count
      if (count <= 1) {
        new Role({
          name: "user",
        }).save();

        new Role({
          name: "moderator",
        }).save();

        new Role({
          name: "admin",
        }).save();
      }
    })
    .catch((err) => {
      // Handle the error
      throw new Error(error);
    });
}

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to test application." });
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
