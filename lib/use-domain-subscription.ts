"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { type DomainEvent, onDomainEvent } from "./domain-events";

export function useDomainSubscription<T>(
  event: DomainEvent,
  selector: () => T
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const [, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const unsub = onDomainEvent(event, refresh);
    return unsub;
  }, [event, refresh]);

  // Evaluate selector on every render so changes to the selector's
  // closure (e.g. certificateId becoming non-null) are reflected
  // immediately without waiting for the next domain event.
  return selectorRef.current();
}
