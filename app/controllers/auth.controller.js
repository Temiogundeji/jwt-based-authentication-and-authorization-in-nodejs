const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const RefreshToken = require("../models/refresh.model");

exports.signup = async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
    });

    const savedUser = await user.save();

    if (req.body.roles) {
      const roles = await Role.find({
        name: { $in: req.body.roles },
      });

      savedUser.roles = roles.map((role) => role._id);

      await savedUser.save();
    } else {
      const defaultRole = await Role.findOne({ name: "user" });
      savedUser.roles = [defaultRole._id];
      await savedUser.save();
    }

    res.status(200).send({ message: "User was registered successfully!" });
  } catch (err) {
    res.status(500).send({ message: err });
  }
};

exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.email }],
    })
      .populate("roles", "-__v")
      .populate("refreshToken");

    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!",
      });
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      algorithm: "HS256",
      allowInsecureKeySizes: true,
      expiresIn: 86400, // 24 hours
    });

    const refreshToken = await RefreshToken.createToken(user);
    const authorities = user.roles.map(
      (role) => "ROLE_" + role.name.toUpperCase()
    );

    //store refresh token in the cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 69 * 60 * 1000,
    });

    res.status(200).send({
      id: user._id,
      username: user.username,
      email: user.email,
      roles: authorities,
      accessToken: token,
      refreshToken,
    });
  } catch (err) {
    res.status(500).send({ message: err });
  }
};

exports.refreshToken = async (req, res, next) => {
  const { refreshToken: refreshToken } = req.body;
  //if refresh token isn't provided, throw an error
  if (refreshToken === null) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }

  try {
    let refreshToken = await RefreshToken.findOne({ token: refreshToken });
    //if the provided refresh token not found in the db throw an error
    if (!refreshToken) {
      res.status(403).json({
        message: "Refresh token not in the database",
      });
      return;
    }
    //if refresh token has expired throw error and ask them to re-login
    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.findByIdAndRemove(refreshToken._id, {
        useFindAndModify: false,
      }).exec();
      res.status(403).json({
        message: "Refresh token was expired. Please make a new signin request",
      });
      return;
    }

    //Implement refresh token detection

    // Create new access and refresh token pair
    let newAccessToken = jwt.sign(
      { id: refreshToken.user._id },
      config.secret,
      {
        expiresIn: config.jwtExpiration,
      }
    );

    const newRefreshToken = await RefreshToken.createToken(user);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken.token,
    });
  } catch {
    return res.status(500).send({ message: err });
  }
};
