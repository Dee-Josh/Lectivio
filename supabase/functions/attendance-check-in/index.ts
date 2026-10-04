// Public attendance check-in (no student login). Runs with the Firebase Admin SDK,
// so Firestore security rules are bypassed here and stay locked down for everyone else.
// Deploy: supabase functions deploy attendance-check-in --no-verify-jwt
import { initializeApp, cert, getApps } from "npm:firebase-admin/app";
import { getFirestore } from "npm:firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: Deno.env.get("FIREBASE_PROJECT_ID")!,
      clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL")!,
      privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();
db.settings({ preferRest: true });
// If you see gRPC errors from the Edge runtime, try: db.settings({ preferRest: true });

const MAX_ACCURACY_M = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const fail = (error: string, extra: Record<string, unknown> = {}) =>
  reply({ ok: false, error, ...extra });

// Must match normKey() in src/utils/attendance.js
const normKey = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ ok: false, error: "BAD_REQUEST" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_REQUEST");
  }

  const matricKey = normKey(body.matric);
  const courseKey = normKey(body.courseCode);
  const code = String(body.code ?? "").trim();
  const { lat, lng, accuracy, deviceId } = body;

  if (!matricKey || !courseKey || !/^\d{5}$/.test(code) || !deviceId) return fail("BAD_REQUEST");
  if (typeof lat !== "number" || typeof lng !== "number" || typeof accuracy !== "number")
    return fail("LOCATION_UNAVAILABLE");

  try {
    // 1. Find the session. Generic error on any miss so codes can't be probed.
    const codeSnap = await db.doc(`attendanceCodes/${courseKey}_${code}`).get();
    if (!codeSnap.exists) return fail("INVALID_CODE");
    const { lecturerId, courseId, sessionId } = codeSnap.data()!;

    const courseRef = db.doc(`lecturers/${lecturerId}/courses/${courseId}`);
    const sessionRef = courseRef.collection("attendanceSessions").doc(sessionId);
    const [courseSnap, sessionSnap] = await Promise.all([courseRef.get(), sessionRef.get()]);
    if (!courseSnap.exists || !sessionSnap.exists) return fail("INVALID_CODE");
    const course = courseSnap.data()!;
    const session = sessionSnap.data()!;

    // 2. Session state + time limit
    if (session.status === "closed") return fail("SESSION_CLOSED");
    if (session.status === "paused") return fail("SESSION_PAUSED");
    const now = Date.now();
    if (now > session.endsAt) return fail("SESSION_EXPIRED");

    // 3. Enrolment (students carry a normalised `matricKey`)
    const studentQ = await courseRef
      .collection("students")
      .where("matricKey", "==", matricKey)
      .limit(1)
      .get();
    if (studentQ.empty) return fail("NOT_ENROLLED");
    const student = studentQ.docs[0].data();

    // 4. Location accuracy, then distance
    if (accuracy > MAX_ACCURACY_M) return fail("LOW_ACCURACY", { accuracyM: Math.round(accuracy) });
    const dist = distanceMetres(lat, lng, session.location.lat, session.location.lng);
    if (dist > session.radiusM)
      return fail("OUTSIDE_RANGE", {
        distanceM: Math.round(dist),
        radiusM: session.radiusM,
        yourLat: lat,
        yourLng: lng,
      });

    // 5. Atomic duplicate checks (student + device) and write
    const deviceHash = (await sha256Hex(`${deviceId}:${sessionId}`)).slice(0, 32);
    const recordRef = sessionRef.collection("records").doc(matricKey);
    const deviceRef = sessionRef.collection("deviceLocks").doc(deviceHash);

    const lateMin = Number(session.lateAfterMinutes) || 0;
    const status = lateMin > 0 && now > session.startedAt + lateMin * 60000 ? "late" : "present";

    try {
      await db.runTransaction(async (tx) => {
        const [rec, dev] = await Promise.all([tx.get(recordRef), tx.get(deviceRef)]);
        // A lecturer-created "absent" placeholder can still be overwritten by a real check-in
        if (rec.exists && rec.data()!.status !== "absent") throw new Error("ALREADY_RECORDED");
        if (dev.exists) throw new Error("DEVICE_USED");
        tx.set(recordRef, {
          matricKey,
          matricNumber: student.matricNumber ?? body.matric,
          name: student.name ?? null,
          status,
          method: "self",
          checkedInAt: now,
          distanceM: Math.round(dist),
          accuracyM: Math.round(accuracy),
          deviceHash,
        });
        tx.set(deviceRef, { matricKey, createdAt: now });
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "ALREADY_RECORDED" || msg === "DEVICE_USED") return fail(msg);
      throw e;
    }

    return reply({
      ok: true,
      status,
      matricNumber: student.matricNumber ?? body.matric,
      courseCode: course.courseCode ?? null,
      courseName: course.courseName ?? null,
      lectureTitle: session.lectureTitle ?? null,
      checkedInAt: now,
      distanceM: Math.round(dist),
    });
  } catch (err) {
    console.error("attendance-check-in failed:", err);
    return reply({ ok: false, error: "SERVER_ERROR" }, 500);
  }
});
