import { useContext } from "react";
import { FirebaseAuthContext } from "@/FirebaseProvider";

/**
 * Drop-in replacement for @animaapp/playground-react-sdk's useAuth.
 * Returns { user, isPending, isAnonymous, login, logout }.
 * The options arg is accepted for API compatibility but unused (Firebase
 * handles session persistence automatically).
 */
export function useAuth(_options?: { requireAuth?: boolean }) {
  return useContext(FirebaseAuthContext);
}
