// app/quiz/submitted/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-20 w-20 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function SubmittedPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-lg flex-col items-center space-y-6 rounded-2xl border bg-card p-10 text-center shadow-2xl">
        <CheckIcon />
        <h1 className="text-4xl font-bold tracking-tight text-card-foreground">
          Submission Complete
        </h1>
        <p className="max-w-sm text-lg text-muted-foreground">
          Thank you for taking the time to complete the assessment. Your responses have been securely recorded.
        </p>
        <div className="w-full pt-4">
          <Link href="/" passHref>
            <Button size="lg" className="w-full">
              Return to Home Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
