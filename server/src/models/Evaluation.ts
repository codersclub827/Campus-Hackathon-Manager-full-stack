import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    judge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rubric: {
      innovation: { type: Number, min: 0, max: 10, required: true },
      execution: { type: Number, min: 0, max: 10, required: true },
      impact: { type: Number, min: 0, max: 10, required: true },
      design: { type: Number, min: 0, max: 10, required: true },
      pitch: { type: Number, min: 0, max: 10, required: true }
    },
    comments: { type: String, required: true }
  },
  { timestamps: true }
);

evaluationSchema.virtual("total").get(function total() {
  const values = Object.values(this.rubric ?? {});
  return values.reduce((sum, value) => sum + value, 0);
});

export const Evaluation = mongoose.model("Evaluation", evaluationSchema);
