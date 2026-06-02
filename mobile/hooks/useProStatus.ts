import { useProStore } from "@/store/proStore";

export function useProStatus(): boolean {
  return useProStore((state) => state.isPro);
}
