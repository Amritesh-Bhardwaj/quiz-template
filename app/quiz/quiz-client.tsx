'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

type NextPayload = {
  index: number;
  total: number;
  question: { id: string; prompt: string; options: string[] };
  perQuestionEndsAt: string;
};

const FrozenOverlay = ({ onResume }: { onResume: () => void }) => (
  <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white text-center p-4">
    <h2 className="text-3xl font-bold">⚠️ Quiz Paused</h2>
    <p className="mt-2 text-lg">Return to fullscreen to continue.</p>
    <Button onClick={onResume} className="mt-6" size="lg">Resume Fullscreen</Button>
  </div>
);

export default function QuizClient({ isAdmin }: { isAdmin: boolean }) {
  const [q, setQ] = useState<NextPayload | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [quizFrozen, setQuizFrozen] = useState(false);
  const [terminated, setTerminated] = useState<{ active: boolean; reason: string }>({ active: false, reason: '' });
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const enteredFS = useRef(false);
  const ignoreNextFS = useRef(false);

  const handleViolation = useCallback(
    (msg: string) => {
      if (isAdmin || terminated.active) return;
      const n = violations + 1;
      setViolations(n);
      if (n >= 3) setTerminated({ active: true, reason: `${msg} (3 violations)` });
      else toast({ title: `Warning #${n}`, description: `${msg}. ${3 - n} left.`, variant: 'destructive' });
    },
    [isAdmin, terminated.active, violations]
  );

  useEffect(() => {
    if (isAdmin || terminated.active) return;

    const onFSChange = () => {
      if (ignoreNextFS.current) {
        ignoreNextFS.current = false;
        enteredFS.current = true;
        setQuizFrozen(false);
        return;
      }
      if (Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement)) {
        enteredFS.current = true;
        setQuizFrozen(false);
      } else if (enteredFS.current) {
        setQuizFrozen(true);
        handleViolation('Exited fullscreen');
      }
    };

    const onVis = () => {
      if (document.hidden && enteredFS.current) handleViolation('Switched tab/window');
    };

    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange as any);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('webkitfullscreenchange', onFSChange as any);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAdmin, terminated.active, handleViolation]);

  const resumeFS = () => {
    const el = document.documentElement as any;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      ignoreNextFS.current = true;
      req.call(el).catch(() => toast({ title: 'Error', description: 'Could not enter fullscreen' }));
    } else {
      toast({ title: 'Unsupported', description: 'Fullscreen not supported' });
    }
  };

  const submit = useCallback(
    async (act: 'answered' | 'skipped') => {
      if (isSubmitting || !q?.question || quizFrozen) return;
      setIsSubmitting(true);

      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: q.question.id,
          choice_index: act === 'answered' ? choice : null,
          action: act,
        }),
      });

      const data = await res.json();

      if (data.finished) {
        window.location.href = '/quiz/submitted';
        return;
      }

      setQ(data);
      setChoice(null);
      setIsSubmitting(false);
    },
    [isSubmitting, q, choice, quizFrozen]
  );

  useEffect(() => {
    if (!q?.perQuestionEndsAt || quizFrozen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const tick = () => {
      if (quizFrozen) return;
      const s = Math.max(0, Math.floor((new Date(q.perQuestionEndsAt).getTime() - Date.now()) / 1000));
      setTimeLeft(s);
      if (!s) {
        clearInterval(timerRef.current!);
        submit('skipped');
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1_000);
    return () => clearInterval(timerRef.current!);
  }, [q, quizFrozen, submit]);

  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      toast({
        title: 'Permissions required',
        description: 'Camera and microphone are required to proceed.',
      });
      throw new Error('No media');
    }
  }

  async function requestPermissions() {
    try {
      await setupCamera();
      setPermissionsGranted(true);
      toast({
        title: 'Permissions granted',
        description: 'You can now start the quiz.',
      });
    } catch {
      // The setupCamera function already shows a toast with an error.
    }
  }

  async function startQuiz() {
    setLoading(true);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      const startRes = await fetch('/api/quiz/start', { method: 'POST' });
      if (!startRes.ok) throw new Error('Could not start quiz');

      const r = await fetch('/api/quiz/next');
      if (!r.ok) {
        toast({ title: 'Error', description: 'Failed loading first question' });
        return;
      }
      const d = await r.json();
      if (d.finished) {
        window.location.href = '/quiz/submitted';
        return;
      }
      setQ(d);
      setChoice(null);
      setStarted(true);
    } catch (e: any) {
      toast({ title: 'Cannot start quiz', description: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (started && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [started]);

  if (!started) {
    return (
      <section className="min-h-dvh flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ready to begin?</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              The quiz is timed, requires fullscreen, and will access your camera and microphone. Switching tabs multiple times will auto-submit.
            </p>
            <Button onClick={requestPermissions} disabled={permissionsGranted}>
              {permissionsGranted ? 'Permissions Granted' : 'Grant Permissions'}
            </Button>
            <Button onClick={startQuiz} disabled={loading || !permissionsGranted}>
              {loading ? 'Starting...' : 'Start Quiz'}
            </Button>
            <div className="relative h-36 rounded bg-muted/50 overflow-hidden">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
              />
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (terminated.active)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-destructive/95 text-destructive-foreground">
        <div className="w-full max-w-lg text-center p-8">
          <h2 className="text-4xl font-extrabold">Session Terminated</h2>
          <p className="mt-4 text-lg">Quiz ended due to {violations} violations.</p>
          <p className="mt-2 font-semibold">{terminated.reason}</p>
          <Button asChild variant="outline" size="lg" className="mt-6">
            <a href="/">Return Home</a>
          </Button>
        </div>
      </div>
    );

  if (quizFrozen) return <FrozenOverlay onResume={resumeFS} />;
  if (!q) return <div className="text-center mt-12">Loading Quiz…</div>;

  const isLast = q.index === q.total - 1;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="p-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <span>
              Question {q.index + 1} / {q.total}
            </span>
            <div className="flex items-center gap-4">
              {violations > 0 && (
                <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">
                  Warnings {violations}/2
                </span>
              )}
              <span className="font-mono text-xl sm:text-2xl">{fmt(timeLeft)}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg sm:text-xl mb-6 font-medium">{q.question.prompt}</p>
          <div className="space-y-3">
            {q.question.options.map((o, i) => (
              <label key={i} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <input type="radio" className="w-5 h-5" name={q.question.id} checked={choice === i} onChange={() => setChoice(i)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button onClick={() => submit('answered')} disabled={choice === null || isSubmitting} size="lg">
              {isLast ? 'Finish & Submit' : 'Submit Answer'}
            </Button>
            {!isLast && (
              <Button onClick={() => submit('skipped')} variant="secondary" disabled={isSubmitting} size="lg">
                Skip
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {mediaStreamRef.current && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-64 h-40 bg-black border-2 border-primary rounded-md shadow-lg z-20 sm:left-auto sm:right-4 sm:translate-x-0">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
