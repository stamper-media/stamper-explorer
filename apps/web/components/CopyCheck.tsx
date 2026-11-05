"use client";
import { createContext, type ReactNode, useContext } from "react";
import { useCopyCheck } from "../lib/use-copy-check";

type CopyCheckState = ReturnType<typeof useCopyCheck>;

const Ctx = createContext<CopyCheckState | null>(null);

/** One copy check shared by the hero: the drop zone, its result panel and the example chips. */
export function CopyCheckProvider({ children }: { children: ReactNode }) {
  const state = useCopyCheck();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useSharedCopyCheck(): CopyCheckState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSharedCopyCheck outside CopyCheckProvider");
  return s;
}
