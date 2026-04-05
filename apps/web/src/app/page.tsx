"use client";

import { Info, MoonStar, Server } from "lucide-react";

const TITLE_TEXT = String.raw`

  ██████╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗██╗  ██╗ █████╗ ██╗         ███████╗███████╗███╗   ██╗
 ██╔════╝██║  ██║██╔══██╗████╗  ██║██╔════╝██║  ██║██╔══██╗██║         ██╔════╝██╔════╝████╗  ██║
 ██║     ███████║███████║██╔██╗ ██║██║     ███████║███████║██║         ███████╗█████╗  ██╔██╗ ██║
 ██║     ██╔══██║██╔══██║██║╚██╗██║██║     ██╔══██║██╔══██║██║         ╚════██║██╔══╝  ██║╚██╗██║
 ╚██████╗██║  ██║██║  ██║██║ ╚████║╚██████╗██║  ██║██║  ██║███████╗    ███████║███████╗██║ ╚████║
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═══╝
`;

const NAME_TEXT = String.raw`

  ██████╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗██╗  ██╗ █████╗ ██╗        
 ██╔════╝██║  ██║██╔══██╗████╗  ██║██╔════╝██║  ██║██╔══██╗██║        
 ██║     ███████║███████║██╔██╗ ██║██║     ███████║███████║██║        
 ██║     ██╔══██║██╔══██║██║╚██╗██║██║     ██╔══██║██╔══██║██║        
 ╚██████╗██║  ██║██║  ██║██║ ╚████║╚██████╗██║  ██║██║  ██║███████╗   
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   

 ███████╗███████╗███╗   ██╗
 ██╔════╝██╔════╝████╗  ██║
 ███████╗█████╗  ██╔██╗ ██║
 ╚════██║██╔══╝  ██║╚██╗██║
 ███████║███████╗██║ ╚████║
 ╚══════╝╚══════╝╚═╝  ╚═══╝
`;

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-zinc-100">
      <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20">
        <pre className="font-mono text-[10px] leading-none text-zinc-100 sm:text-xs md:text-sm">
          {TITLE_TEXT}
        </pre>
        <pre className="mt-4 font-mono text-[10px] leading-none text-zinc-400 sm:text-xs md:text-sm">
          {NAME_TEXT}
        </pre>
      </div>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50">System Status</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              The platform is configured for recording, speaker selection, and
              transcript workflows from a single dashboard.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-emerald-300">
            <MoonStar className="size-3.5" />
            System Ready
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <Server className="size-4 text-cyan-300" />
              Backend Panel
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              API routes and recording services are organized for the recorder
              workflow and upload lifecycle.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <Info className="size-4 text-amber-300" />
              Recorder
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Mic-only capture, four-user selection, and transcript flow remain on the
              recorder screen.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <MoonStar className="size-4 text-fuchsia-300" />
              Theme
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              The interface uses a dark layout to keep the dashboard focused and
              presentation ready.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
