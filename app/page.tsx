import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-col items-center mt-16 pt-8 bg-white">
      <Card className="w-full max-w-md p-4 mt-8 space-y-2 md:p-8 md:space-y-4">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Welcome to the Quiz Portal
          </CardTitle>
          <CardDescription>
            Test your knowledge with our secure and engaging quizzes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>
            Ready to challenge yourself? Sign up to take a quiz, or log in to
            continue where you left off.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Link href="/auth/sign-up">
            <Button size="lg">Sign Up</Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="secondary">
              Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
