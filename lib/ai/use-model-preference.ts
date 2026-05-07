"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Hook : conserve la preference de modele de l'utilisateur dans le
 * localStorage. Une cle distincte par usage (copilot, vision, ...) pour
 * permettre des choix differents.
 *
 * Utilise useSyncExternalStore (l'API React canonique pour synchroniser
 * un state avec un store externe comme localStorage) plutot qu'un
 * useEffect, ce qui :
 *  - evite les warnings react-hooks/set-state-in-effect
 *  - empeche les mismatch d'hydratation (snapshot serveur explicite)
 *  - propage les changements meme entre onglets via l'event storage
 */

type Usage = "copilot" | "vision" | "redaction";

const KEY_PREFIX = "bissapa.ai.model.";

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

export function useModelPreference(usage: Usage, defaultModel: string) {
  const key = KEY_PREFIX + usage;

  const model = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? defaultModel;
      } catch {
        return defaultModel;
      }
    },
    () => defaultModel,
  );

  const setModel = useCallback(
    (id: string) => {
      try {
        localStorage.setItem(key, id);
        // L'event storage natif ne se declenche pas dans l'onglet
        // courant : on le dispatche manuellement pour reveiller les
        // souscripteurs locaux (ce hook + autres composants).
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // ignore
      }
    },
    [key],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new StorageEvent("storage", { key }));
    } catch {
      // ignore
    }
  }, [key]);

  return { model, setModel, reset };
}
