import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const SET_ROLE_CLAIM_URL =
  "https://akrevvbdrueqaefxdazh.functions.supabase.co/set-role-claim";

async function ensureRoleClaim(user) {
  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.role === "authenticated") return;

  const res = await fetch(SET_ROLE_CLAIM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: user.uid }),
  });
  if (!res.ok) throw new Error(`set-role-claim returned ${res.status}`);

  await user.getIdToken(true); // refresh so the new claim is in the token
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await ensureRoleClaim(user);
        } catch (err) {
          // Don't block the app if this fails; only storage uploads will be affected
          console.error("Failed to ensure role claim:", err);
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}