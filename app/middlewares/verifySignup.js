const db = require("../models");
const ROLES = db.ROLES;
const User = db.user;

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {
    // Username
    let usernameExist = await User.findOne({
      username: req.body.username,
    });
    if (usernameExist) {
      throw new Error("User already exists");
    }
    // Email
    let emailExist = await User.findOne({ email: req.body.email });
    if (emailExist) {
      throw new Error("Email already exists");
    }
    next();
  } catch (e) {
    return res.status(500).send({ message: e.message || "An error occurred." });
  }
};

const checkRolesExisted = (req, res, next) => {
  if (req.body.roles) {
    for (let i = 0; i < req.body.roles.length; i++) {
      if (!ROLES.includes(req.body.roles[i])) {
        res.status(400).send({
          message: `Failed! Role ${req.body.roles[i]} does not exist!`,
        });
        return;
      }
    }
  }

  next();
};

const verifySignUp = {
  checkDuplicateUsernameOrEmail,
  checkRolesExisted,
};

module.exports = verifySignUp;
