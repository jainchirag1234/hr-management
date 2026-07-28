import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, CheckCircle, ArrowLeft } from "lucide-react";
import axios from "axios";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/user/forgot-password`,
        { email }
      );
      setSuccess(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6 mx-4 sm:mx-0">

        {/* Icon + Heading */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Forgot Password?
          </h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Enter your registered email to receive a reset link
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {success ? (
          /* Success State */
          <div className="flex flex-col items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-5 text-center">
            <CheckCircle className="text-green-500" size={40} />
            <h2 className="text-green-700 font-semibold text-base">
              Reset Link Sent!
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              If <span className="font-medium text-gray-700">{email}</span> is
              registered, you'll receive a password reset email shortly. Please
              check your inbox (and spam folder).
            </p>
            <Link
              to="/login"
              className="mt-2 text-blue-600 text-sm hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={submitHandler}>
            <div className="mb-4">
              <label className="block mb-2 text-gray-700 font-medium text-sm">
                Email Address
              </label>
              <input
                type="email"
                className="w-full border p-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
