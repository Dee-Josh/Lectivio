import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with that email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Lectivio</h1>

        {sent ? (
          <>
            <h2>Check your email</h2>
            <p>
              We've sent a password reset link to <strong>{email}</strong>.
              Click the link in the email to set a new password.
            </p>
            <p className="muted small">
              Didn't get it? Check your spam folder, or{" "}
              <button
                className="link-btn"
                onClick={() => setSent(false)}
                type="button"
              >
                try again
              </button>
              .
            </p>
            <p>
              <Link to="/login">← Back to Sign In</Link>
            </p>
          </>
        ) : (
          <>
            <h2>Reset your password</h2>
            <p>
              Enter your email and we'll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleReset}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu.ng"
                required
              />

              {error && <p className="error">{error}</p>}

              <button
                type="submit"
                className="primary-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p>
              <Link to="/login">← Back to Sign In</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}