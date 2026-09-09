"use client";

import { useEffect, useState } from "react";
import type { TriviaQuestion, LoungeScoreEvent } from "@repo/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

interface Props {
  restaurantId: string;
  mealSlotId: string;
  playerName: string;
}

// The "play a quest/game with other people also waiting" feature from
// Section 11 of the plan. Deliberately simple: each player answers their own
// question locally, then broadcasts their running score to everyone else
// currently waiting at this restaurant for the same meal slot - the leaderboard
// is what makes it feel shared rather than solitary.
export function TriviaWidget({ restaurantId, mealSlotId, playerName }: Props) {
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws?restaurantId=${restaurantId}`);
    ws.onmessage = (message) => {
      const event = JSON.parse(message.data);
      if (event.type === "lounge:score" && event.mealSlotId === mealSlotId) {
        const scoreEvent = event as LoungeScoreEvent;
        setLeaderboard((prev) => ({ ...prev, [scoreEvent.name]: scoreEvent.score }));
      }
    };
    setSocket(ws);
    return () => ws.close();
  }, [restaurantId, mealSlotId]);

  useEffect(() => {
    loadQuestion();
  }, []);

  function loadQuestion() {
    setSelected(null);
    fetch(`${API_BASE}/api/trivia`)
      .then((r) => r.json())
      .then((data) => setQuestion(data.question));
  }

  function answer(index: number) {
    if (selected !== null || !question) return;
    setSelected(index);
    const correct = index === question.correctIndex;
    const nextScore = correct ? score + 1 : score;
    setScore(nextScore);
    setLeaderboard((prev) => ({ ...prev, [playerName]: nextScore }));

    const event: LoungeScoreEvent = {
      type: "lounge:score",
      restaurantId,
      mealSlotId,
      name: playerName,
      score: nextScore
    };
    socket?.send(JSON.stringify(event));
  }

  const ranked = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  if (!question) return null;

  return (
    <div className="mt-8 rounded-card border border-turmeric-400/30 bg-turmeric-100/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-turmeric-600">Food Trivia · While you wait</p>
      <p className="mb-3 text-base text-ink-900">{question.question}</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {question.options.map((option, i) => {
          const isCorrect = selected !== null && i === question.correctIndex;
          const isWrong = selected === i && i !== question.correctIndex;
          return (
            <button
              key={option}
              onClick={() => answer(i)}
              disabled={selected !== null}
              className={`rounded-card border px-3 py-2 text-sm ${
                isCorrect
                  ? "border-leaf-500 bg-leaf-100 text-leaf-700"
                  : isWrong
                  ? "border-chili-400 bg-chili-400/10 text-chili-600"
                  : "border-ink-100 text-ink-700"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button onClick={loadQuestion} className="mb-4 text-sm font-medium text-chili-600">
          Next question →
        </button>
      )}

      {ranked.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            While you're waiting
          </p>
          <ul className="space-y-1 text-sm">
            {ranked.slice(0, 5).map(([name, s]) => (
              <li key={name} className="flex justify-between text-ink-700">
                <span>{name}</span>
                <span className="font-medium">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
