"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";

const loginRoles: Role[] = ["USER", "VENDOR"];

// --- Main Login Page Component ---
export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuth();

  const [role, setRole] = useState<Role>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      if (role === "USER") {
        const { user, token } = await api.loginUser(email, password);
        setAuth(user, token);
        navigate("/user/dashboard", { replace: true });
      } else {
        const { vendor, token } = await api.loginVendor(email, password);
        setAuth({
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          role: vendor.role,
          services: vendor.services,
        }, token);
        navigate("/vendor/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === "VENDOR" ? "/vendor/dashboard" : "/user/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="flex min-h-screen w-full bg-white items-center justify-center">
      {/* --- Centered Form Container --- */}
      <div className="w-full max-w-md p-8">
        <div className="w-full">
          {/* Logo (clickable) */}
          <Link to="/" className="inline-block mb-6">
            <img src="/assests/icon6.png" alt="Q Connect Logo" className="h-16 w-auto object-contain hover:opacity-80 transition-opacity cursor-pointer" />
          </Link>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold mb-2 text-black"
          >
            Welcome back!
          </motion.h1>

          {/* Subtitle */}
          <p className="text-gray-600 mb-6">
            Choose your account type and continue to your dashboard.
          </p>

          {/* Role Toggle */}
          <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-300">
            {loginRoles.map((loginRole) => (
              <button
                key={loginRole}
                type="button"
                onClick={() => setRole(loginRole)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  role === loginRole
                    ? "bg-black text-white"
                    : "bg-transparent text-gray-600 hover:text-black"
                }`}
              >
                {loginRole === "USER" ? "User" : "Vendor"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="youremail@yourdomain.com"
                  required
                  className="w-full bg-white border border-gray-300 rounded-md p-3 pl-10 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white border border-gray-300 rounded-md p-3 pl-10 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Toggle Link */}
          <p className="text-center text-sm text-gray-600 mt-8">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-black hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
