const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models/index.js");
const User = db.user;
const Role = db.role;

const { TokenExpiredError } = jwt;

const catchError = (error, res) => {
  if (error instanceof TokenExpiredError) {
    return res
      .status(401)
      .send({ message: "Unauthorized! Access Token was expired!" });
  }

  return res.sendStatus(401).send({ message: "Unauthorized!" });
};

const verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return catchError(err, res);
    }
    req.userId = decoded.id;
    next();
  });
};

const checkUserRole = async (req, res, next, roleName) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const roles = await Role.find({
      _id: { $in: user.roles },
      name: roleName,
    }).exec();

    if (!roles || roles.length === 0) {
      return res.status(403).send({ message: `Require ${roleName} Role!` });
    }

    next();
  } catch (err) {
    res.status(500).send({ message: err });
  }
};

const isAdmin = async (req, res, next) => {
  await checkUserRole(req, res, next, "admin");
};

const isModerator = async (req, res, next) => {
  await checkUserRole(req, res, next, "moderator");
};

const authJwt = {
  verifyToken,
  isAdmin,
  isModerator,
};
module.exports = authJwt;
