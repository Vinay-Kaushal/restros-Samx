import { Router } from "express";
import type { TriviaQuestion } from "@repo/types";

export const triviaRouter = Router();

// Static question bank for the waiting-lounge game. This is deliberately
// simple - client-driven, not server-authoritative rounds - so it ships fast
// without new infra. See Section 11 of the plan for the fuller game ideas
// (guess-the-dish, spin-the-wheel) this could grow into later.
const QUESTIONS: TriviaQuestion[] = [
  { id: "q1", question: "Which spice gives biryani its golden color?", options: ["Turmeric", "Saffron", "Paprika", "Cumin"], correctIndex: 1 },
  { id: "q2", question: "Paneer is made from which ingredient?", options: ["Soy", "Milk", "Lentils", "Coconut"], correctIndex: 1 },
  { id: "q3", question: "Which region is butter chicken originally from?", options: ["Punjab", "Kerala", "Bengal", "Gujarat"], correctIndex: 0 },
  { id: "q4", question: "Dal makhani is primarily made with which lentil?", options: ["Yellow moong", "Black urad", "Chana", "Toor"], correctIndex: 1 },
  { id: "q5", question: "Tandoori dishes are traditionally cooked in what?", options: ["A wok", "A clay oven", "A pressure cooker", "A grill pan"], correctIndex: 1 }
];

triviaRouter.get("/trivia", (_req, res) => {
  const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  res.json({ question });
});
