import { useEffect, useState } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Entity → Firestore collection name ──────────────────────────────────────

type EntityName =
  | "Lead"
  | "Patient"
  | "Quote"
  | "Appointment"
  | "Task"
  | "TravelRecord"
  | "Payment"
  | "MediaFile"
  | "Service";

const COLLECTIONS: Record<EntityName, string> = {
  Lead:         "leads",
  Patient:      "patients",
  Quote:        "quotes",
  Appointment:  "appointments",
  Task:         "tasks",
  TravelRecord: "travelRecords",
  Payment:      "payments",
  MediaFile:    "mediaFiles",
  Service:      "services",
};

// ─── Query options ────────────────────────────────────────────────────────────

interface QueryOptions {
  where?:   Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  limit?:   number;
}

// ─── useQuery ────────────────────────────────────────────────────────────────
//
// Three call signatures (mirrors Anima SDK):
//   useQuery("Entity")                  → live collection (no filter)
//   useQuery("Entity", options)         → live collection with filter/sort/limit
//   useQuery("Entity", "docId")         → live single-document fetch
//   useQuery("Entity", null/undefined)  → skipped; returns { data: null, isPending: false }

export function useQuery(
  entity: EntityName,
  idOrOptions?: string | QueryOptions | null
): { data: any; isPending: boolean; error: Error | null } {
  const [data, setData]           = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError]         = useState<Error | null>(null);

  // Stable cache key so the effect re-runs only when the query actually changes
  const cacheKey =
    typeof idOrOptions === "string"
      ? idOrOptions
      : idOrOptions == null
        ? "__skip__"
        : JSON.stringify(idOrOptions);

  useEffect(() => {
    // ── Skip fetch when id/options is explicitly null or undefined ────────────
    if (idOrOptions == null) {
      setData(null);
      setIsPending(false);
      return;
    }

    setIsPending(true);
    const colName = COLLECTIONS[entity];

    // ── Single-document listener ─────────────────────────────────────────────
    if (typeof idOrOptions === "string") {
      if (!idOrOptions.trim()) {
        setData(null);
        setIsPending(false);
        return;
      }
      const docRef = doc(db, colName, idOrOptions);
      return onSnapshot(
        docRef,
        (snap) => {
          setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          setIsPending(false);
          setError(null);
        },
        (err) => {
          setError(err);
          setIsPending(false);
        }
      );
    }

    // ── Collection listener ───────────────────────────────────────────────────
    const opts = idOrOptions as QueryOptions;
    const constraints: QueryConstraint[] = [];

    if (opts.where) {
      for (const [field, value] of Object.entries(opts.where)) {
        if (value !== undefined) {
          constraints.push(where(field, "==", value));
        }
      }
    }

    if (opts.orderBy) {
      for (const [field, dir] of Object.entries(opts.orderBy)) {
        constraints.push(orderBy(field, dir as "asc" | "desc"));
      }
    }

    if (opts.limit) {
      constraints.push(limit(opts.limit));
    }

    const colRef = collection(db, colName);
    const q      = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);

    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setIsPending(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setIsPending(false);
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, cacheKey]);

  return { data, isPending, error };
}

// ─── useMutation ─────────────────────────────────────────────────────────────
//
// Returns { create, update, remove, isPending, error }
// Mirrors the Anima SDK's useMutation exactly.

export function useMutation(entity: EntityName) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError]         = useState<Error | null>(null);

  const colName = COLLECTIONS[entity];

  /** Create a new document. Returns the created record (with Firestore id). */
  const create = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    setIsPending(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, colName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: docRef.id, ...data };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  /** Update an existing document by id. */
  const update = async (id: string, data: Record<string, unknown>): Promise<void> => {
    setIsPending(true);
    setError(null);
    try {
      await updateDoc(doc(db, colName, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  /** Delete a document by id. */
  const remove = async (id: string): Promise<void> => {
    setIsPending(true);
    setError(null);
    try {
      await deleteDoc(doc(db, colName, id));
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  return { create, update, remove, isPending, error };
}
