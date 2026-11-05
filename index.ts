// Vercel AI Gateway + AI SDK example.
// The gateway key is read from AI_GATEWAY_API_KEY (.env.local, never committed).
// Run: npm run ai:example
import { generateText } from "ai";

const { text } = await generateText({
  model: "moonshotai/kimi-k3",
  prompt: "Invent a new holiday and describe its traditions.",
});

console.log(text);
