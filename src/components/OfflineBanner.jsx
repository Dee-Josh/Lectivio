import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  function currentScreen() {
    return (useLocation().pathname);
  };

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) return null;

  function displayOfflineBanner() {
    if (currentScreen() == '/' ||currentScreen() == '/landing' || currentScreen() == '/login'|| currentScreen() == '/signup') {
      console.log(currentScreen() == '/landing' || currentScreen() == '/login'|| currentScreen() == '/signup')
      return true;
    }
  }

  return (
    !displayOfflineBanner() && <div className="offline-banner">
      You're offline — changes will save and sync once you're reconnected.
    </div>
  );
}