"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import QuizClient from "./quiz-client";

export default function QuizGatePage({ isAdmin }: { isAdmin: boolean }) {
  const [step, setStep] = useState<"instructions" | "quiz">("instructions");

  if (step === "quiz") return <QuizClient isAdmin={isAdmin} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-black p-4">
      <Card className="w-full max-w-lg border border-black/10 bg-white shadow-md rounded-2xl">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            Assessment Rules
          </CardTitle>
          <CardDescription className="text-gray-600">
            Review the rules carefully before you begin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3 text-sm text-gray-800">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>
                The quiz consists of <b>20 questions</b>, each with a <b>90-second</b> time limit.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>
                <b>Fullscreen is mandatory.</b> Exiting will pause the quiz and issue a warning.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>
                <b>Proctoring is enabled.</b> Your camera and microphone must remain active.
              </span>
            </li>
          </ul>
          <Button
            onClick={() => setStep("quiz")}
            size="lg"
            className="w-full mt-6 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition"
          >
            Accept and Begin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
