import React, { createContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface VitaUser {
  id:       string;
  email:    string;
  name:     string | null;
  photoUrl: string | null;
}

export interface AuthContextValue {
  user:        VitaUser | null;
  isPending:   boolean;
  isAnonymous: boolean;
  login:       () => Promise<void>;
  logout:      () => Promise<void>;
}

export const FirebaseAuthContext = createContext<AuthContextValue>({
  user:        null,
  isPending:   true,
  isAnonymous: true,
  login:       async () => {},
  logout:      async () => {},
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<VitaUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(
        fbUser
          ? {
              id:       fbUser.uid,
              email:    fbUser.email ?? "",
              name:     fbUser.displayName,
              photoUrl: fbUser.photoURL,
            }
          : null
      );
      setIsPending(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        isPending,
        isAnonymous: user === null,
        login,
        logout,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}
