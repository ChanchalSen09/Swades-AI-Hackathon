"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, ServerCrash } from "lucide-react";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

const TITLE_TEXT = `

  ██████╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗██╗  ██╗ █████╗ ██╗         ███████╗███████╗███╗   ██╗
 ██╔════╝██║  ██║██╔══██╗████╗  ██║██╔════╝██║  ██║██╔══██╗██║         ██╔════╝██╔════╝████╗  ██║
 ██║     ███████║███████║██╔██╗ ██║██║     ███████║███████║██║         ███████╗█████╗  ██╔██╗ ██║
 ██║     ██╔══██║██╔══██║██║╚██╗██║██║     ██╔══██║██╔══██║██║         ╚════██║██╔══╝  ██║╚██╗██║
 ╚██████╗██║  ██║██║  ██║██║ ╚████║╚██████╗██║  ██║██║  ██║███████╗    ███████║███████╗██║ ╚████║
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═══╝
`;

type ApiState =
  | { kind: "loading" }
  | { kind: "healthy"; message: string }
  | { kind: "unhealthy"; message: string };

export default function Home() {
  const [apiState, setApiState] = useState<ApiState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const checkApi = async () => {
      setApiState({ kind: "loading" });

      try {
        const response = await fetch(serverUrl, {
          method: "GET",
        });

        const body = await response.text();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setApiState({
            kind: "unhealthy",
            message: `API responded with ${response.status}.`,
          });
          return;
        }

        setApiState({
          kind: "healthy",
          message: body.trim() || "API is responding normally.",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setApiState({
          kind: "unhealthy",
          message:
            error instanceof Error ? error.message : "Unable to reach the API.",
        });
      }
    };

    void checkApi();
    const intervalId = window.setInterval(() => {
      void checkApi();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-4">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium">API Status</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live health check for the backend service used by the recorder.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">{serverUrl}</div>
          </div>

          {apiState.kind === "loading" && (
            <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-muted/20 px-3 py-3 text-sm">
              <LoaderCircle className="size-4 animate-spin" />
              Checking backend status...
            </div>
          )}

          {apiState.kind === "healthy" && (
            <div className="rounded-sm border border-emerald-300/60 bg-emerald-100/60 px-4 py-3 text-sm text-emerald-950">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4" />
                Backend is healthy
              </div>
              <div className="mt-2">{apiState.message}</div>
            </div>
          )}

          {apiState.kind === "unhealthy" && (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <ServerCrash className="size-4" />
                Backend is unreachable
              </div>
              <div className="mt-2">{apiState.message}</div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <AlertTriangle className="size-3" />
                Check whether the server is running on port 3000.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
