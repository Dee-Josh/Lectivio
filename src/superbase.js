import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase";

export const supabase = createClient(
  "https://akrevvbdrueqaefxdazh.supabase.co",
  "sb_publishable_7t0AQMop2fKQHXpD9dlHhg_ernq5d7i4",
  {
    accessToken: async () => {
      return (await auth.currentUser?.getIdToken(false)) ?? null;
    },
  }
);