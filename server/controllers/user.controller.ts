import { NextFunction, Request, Response } from "express";
import { ParamsDictionary, Query } from "express-serve-static-core";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User, { UserInterface } from "../models/user.model";
import { Document } from "mongoose";

const LOG_TYPE = {
  SIGN_IN: "sign in",
  LOGOUT: "logout",
} as const;

const LEVEL = {
  INFO: "info",
  ERROR: "error",
  WARN: "warn",
} as const;

const MESSAGE = {
  SIGN_IN_ATTEMPT: "User attempting to sign in",
  SIGN_IN_ERROR: "Error occurred while signing in user: ",
  INCORRECT_EMAIL: "Incorrect email",
  INCORRECT_PASSWORD: "Incorrect password",
  DEVICE_BLOCKED: "Sign in attempt from blocked device",
  CONTEXT_DATA_VERIFY_ERROR: "Context data verification failed",
  MULTIPLE_ATTEMPT_WITHOUT_VERIFY:
    "Multiple sign in attempts detected without verifying identity.",
  LOGOUT_SUCCESS: "User has logged out successfully",
} as const;

const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  let newUser: Document<unknown, {}, UserInterface> &
    UserInterface &
    Required<{ _id: unknown }>;
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const emailDomain = req.body.email.split("@")[1];
  const role = emailDomain === "" ? "admin" : "general";

  newUser = new User({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    role: role,
  });

  try {
    await newUser.save();

    if (newUser.isNew) {
      throw new Error("Failed to create new user");
    }

    res.status(201).json({
      message: "User added successfully",
      user: { newUser },
    });
  } catch (err) {
    res.status(400).json({
      message: "Failed to add user",
    });
  }
};

export { signup };
