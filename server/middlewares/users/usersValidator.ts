import { check, validationResult } from "express-validator";
import User from "../../models/user.model";
import { NextFunction, Response, Request } from "express";

export const addUserValidator = [
  check("username")
    .trim()
    .custom(async (value) => {
      try {
        const user = await User.findOne({ username: value });
        if (user) {
          throw new Error("There is already a user with that username");
        }
      } catch (err) {
        throw err;
      }
    }),
  check("email")
    .isEmail()
    .withMessage("Invalid email address")
    .trim()
    .custom(async (value) => {
      try {
        const user = await User.findOne({ email: value });
        if (user) {
          throw new Error("There is already a user with that email address");
        }
      } catch (err) {
        throw err;
      }
    }),
  check(
    "password",
    "Please enter a password with 6 or more characters"
  ).isLength({ min: 6 }),
  check("role").default("general"),
];

export const addUserValidatorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  const mappedErrors = errors.mapped();

  if (Object.keys(mappedErrors).length === 0) {
    next();
  } else {
    res
      .status(400)
      .json({ errors: Object.values(mappedErrors).map((error) => error.msg) });
  }
};
