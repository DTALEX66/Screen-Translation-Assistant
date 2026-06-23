import { useState, useCallback, useRef } from "react";

export function useToast(duration = 2000) {
  const [toast, setToast] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast(message);
      timerRef.current = setTimeout(() => {
        setToast("");
        timerRef.current = null;
      }, duration);
    },
    [duration],
  );

  return {
    toast,
    showToast,
  };
}
