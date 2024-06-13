import mongoose, { Document, Schema } from "mongoose";

export interface UserInterface extends Document {
  username: string;
  email: string;
  password: string;
  role: "general" | "admin";
  isEmailVerified: boolean;
}

const userSchema: Schema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, unique: true, required: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["general", "admin"],
      required: true,
      default: "general",
    },
    isEmailVerified: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

userSchema.index({ name: "text"})

const User = mongoose.model<UserInterface>("User", userSchema)
export default User;