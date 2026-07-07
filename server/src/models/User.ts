import bcrypt from "bcryptjs";
import mongoose, { InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "mentor", "judge", "admin"], default: "student" },
    avatar: String,
    skills: [String],
    status: { type: String, enum: ["active", "invited", "suspended"], default: "active" }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export type UserDocument = InferSchemaType<typeof userSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
};

export const User = mongoose.model("User", userSchema);
