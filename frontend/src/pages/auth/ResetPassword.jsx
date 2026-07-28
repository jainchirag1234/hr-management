import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, CheckCircle } from "lucide-react";
import axios from "axios";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Auto-redirect to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/user/reset-password/${token}`,
        { password }
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

  // Password strength checker
  const getStrength = (pwd) => {
    if (!pwd) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-400" };
    if (score <= 3) return { level: 2, label: "Fair", color: "bg-yellow-400" };
    return { level: 3, label: "Strong", color: "bg-green-500" };
  };

  const strength = getStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6 mx-4 sm:mx-0">

        {/* Icon + Heading */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Set New Password
          </h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Create a strong password for your HRMS account
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
              Password Reset Successful!
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your password has been updated. Redirecting to login in 3
              seconds...
            </p>
            <Link
              to="/login"
              className="text-blue-600 text-sm hover:underline mt-1"
            >
              Go to Login now →
            </Link>
          </div>
        ) : (
          <form onSubmit={submitHandler}>
            {/* New Password */}
            <div className="mb-4">
              <label className="block mb-2 text-gray-700 font-medium text-sm">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full border p-3 rounded pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Strength Bar */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i <= strength.level ? strength.color : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Strength:{" "}
                    <span
                      className={
                        strength.level === 1
                          ? "text-red-500"
                          : strength.level === 2
                          ? "text-yellow-500"
                          : "text-green-600"
                      }
                    >
                      {strength.label}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block mb-2 text-gray-700 font-medium text-sm">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  className={`w-full border p-3 rounded pr-10 text-sm focus:outline-none focus:ring-2 ${
                    confirmPassword
                      ? password === confirmPassword
                        ? "border-green-400 focus:ring-green-300"
                        : "border-red-400 focus:ring-red-300"
                      : "focus:ring-blue-400"
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
