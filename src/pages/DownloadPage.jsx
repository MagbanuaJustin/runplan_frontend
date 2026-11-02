import { useState } from "react";
import { Link } from "react-router-dom";
import { apiDownload } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import LiveBackground from "../components/LiveBackground.jsx";
import { useToastOnChange } from "../components/Toast.jsx";

export default function DownloadPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useToastOnChange(message);
  useToastOnChange(error, "error");

  async function handleDownload() {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const blob = await apiDownload("/downloads/android");

      if (!blob || blob.size === 0) {
        throw new Error(
          "The Android package was empty. Please try again later.",
        );
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "RunPlan-Android.apk";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("Download started. Open the APK from your phone’s Downloads.");
    } catch (err) {
      setError(err.message || "Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <LiveBackground />
      <p className="section-eyebrow">RunPlan for Android</p>
      <h1>Download the app</h1>
      <p className="note">
        You’re signed in as{" "}
        <strong>{user?.email || "your RunPlan account"}</strong>. Use the button
        below to download the Android installer.
      </p>

      <section className="plan-card" aria-busy={busy}>
        <h2>Android app</h2>
        <p>
          The APK download is available to signed-in RunPlan users. After it
          downloads, open the file on your phone and follow Android’s install
          prompts.
        </p>

        <button
          className="btn btn-primary"
          type="button"
          onClick={handleDownload}
          disabled={busy}
        >
          {busy ? "Preparing download…" : "Download RunPlan APK"}
        </button>
      </section>

      <p className="note">
        If Android says the app can’t be installed over your existing debug
        version, uninstall that version first, then open the downloaded APK.
      </p>

      <Link to="/dashboard">Back to your dashboard</Link>
    </div>
  );
}
