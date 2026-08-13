const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

exports.handler = async (event) => {
  try {
    const { uid } = JSON.parse(event.body);
    if (!uid) return { statusCode: 400, body: "Missing uid" };

    await admin.auth().setCustomUserClaims(uid, { role: "authenticated" });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("set-role-claim failed:", err);
    return { statusCode: 500, body: "Failed to set role claim" };
  }
};