import Express from "express";
import authRouter from "./auth.routes";

export default function (app: Express.Application) {
  app.use("/auth/users", authRouter);
}
