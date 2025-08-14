import express from "express";
import { generateWithFailover } from "../geminiClient.js";

const router = express.Router();

router.post("/generate-course", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const result = await generateWithFailover(prompt);

  if (result.success) {
    res.json({ content: result.data });
  } else {
    res.status(503).json({
      error: "All Gemini API keys are exhausted. Please try again later.",
    });
  }
});

export default router;
