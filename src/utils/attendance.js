// Shared helpers for the attendance feature (lecturer tab + public student page)

export const FUNCTIONS_URL = "https://akrevvbdrueqaefxdazh.supabase.co/functions/v1";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7t0AQMop2fKQHXpD9dlHhg_ernq5d7i4";

// Matric numbers and course codes are compared in this form everywhere
// ("ME/21/1001" -> "ME211001", "MEE 504" -> "MEE504"). Also safe as a Firestore doc ID.
export const normKey = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function generateCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 90000;
  return String(10000 + n);
}

export function getDeviceId() {
  let id = localStorage.getItem("lectivio_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lectivio_device_id", id);
  }
  return id;
}

// Watches GPS for a few seconds and returns the most accurate reading.
// Rejects with { code: "DENIED" | "UNAVAILABLE" | "UNSUPPORTED" | "TIMEOUT" }.
export function getBestPosition({ targetAccuracy = 30, maxWaitMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject({ code: "UNSUPPORTED" });
    let best = null;
    let done = false;
    let watchId = null;
    let timer = null;

    const cleanup = () => {
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
    };
    const finish = () => {
      if (done) return;
      cleanup();
      best ? resolve(best) : reject({ code: "TIMEOUT" });
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (!best || c.accuracy < best.accuracy) best = c;
        if (c.accuracy <= targetAccuracy) finish();
      },
      (err) => {
        if (done) return;
        cleanup();
        reject({ code: err.code === 1 ? "DENIED" : "UNAVAILABLE" });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    timer = setTimeout(finish, maxWaitMs);
  });
}

export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// What the student sees for each error code returned by the check-in function
export const CHECKIN_ERRORS = {
  INVALID_CODE: {
    title: "Code not recognised",
    message: "The course code or attendance code is wrong, or the session has ended. Check the lecturer's screen.",
    retry: true,
  },
  SESSION_PAUSED: {
    title: "Attendance paused",
    message: "The lecturer has paused attendance. Wait a moment and try again.",
    retry: true,
  },
  SESSION_CLOSED: {
    title: "Attendance closed",
    message: "This attendance session has been closed.",
    retry: false,
  },
  SESSION_EXPIRED: {
    title: "Code expired",
    message: "This attendance code has expired. Ask your lecturer if attendance can be reopened.",
    retry: false,
  },
  NOT_ENROLLED: {
    title: "Not on the class list",
    message: "This matric number isn't registered for this course. Check it and try again, or tell your lecturer.",
    retry: true,
  },
  ALREADY_RECORDED: {
    title: "Already recorded",
    message: "Your attendance for this session has already been recorded.",
    retry: false,
  },
  DEVICE_USED: {
    title: "Device already used",
    message: "This device has already been used to log attendance for this session.",
    retry: false,
  },
  LOW_ACCURACY: {
    title: "Location not precise enough",
    message: "Your device couldn't get a precise location. Turn on precise location or GPS, move near a window, and try again.",
    retry: true,
  },
  OUTSIDE_RANGE: {
    title: "Attendance Not Recorded",
    message: "You are outside the permitted attendance location.",
    retry: true,
  },
  LOCATION_DENIED: {
    title: "Location access blocked",
    message: "Lectivio needs your location to verify you're in class. Allow location access for this site in your browser settings, then try again.",
    retry: true,
  },
  LOCATION_UNAVAILABLE: {
    title: "Couldn't get your location",
    message: "Turn on location services on your device and try again.",
    retry: true,
  },
  NETWORK: {
    title: "Connection problem",
    message: "Couldn't reach Lectivio. Check your internet connection and try again.",
    retry: true,
  },
  BAD_REQUEST: {
    title: "Check your details",
    message: "Please fill in your matric number, course code and the 5-digit attendance code.",
    retry: true,
  },
  SERVER_ERROR: {
    title: "Something went wrong",
    message: "We couldn't record your attendance. Please try again.",
    retry: true,
  },
};
