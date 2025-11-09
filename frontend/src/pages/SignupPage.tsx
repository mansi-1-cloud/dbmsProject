"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";

const signupRoles: Role[] = ["USER", "VENDOR"];

// --- Main Signup Page Component ---
export function SignupPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuth();

  const [role, setRole] = useState<Role>("USER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [servicesInput, setServicesInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === "VENDOR" ? "/vendor/dashboard" : "/user/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      if (role === "USER") {
        const { user, token } = await api.registerUser(email, name, password);
        setAuth(user, token);
        navigate("/user/dashboard", { replace: true });
      } else {
        const services = servicesInput
          .split(",")
          .map((service) => service.trim())
          .filter(Boolean);

        if (services.length === 0) {
          throw new Error("Please list at least one service you provide.");
        }

        const { vendor, token } = await api.registerVendor(email, name, password, services);
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
      setError(err?.message || "Unable to create the account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-black text-white">
      {/* --- Left Column: Form (Half width on medium screens and up) --- */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* Logo (simple dark-mode style) */}
          <div className="h-10 w-10 bg-white rounded-lg mb-8"></div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold mb-2 text-white"
          >
            Create account
          </motion.h1>

          {/* Subtitle */}
          <p className="text-gray-400 mb-8">
            Select your role and join the platform to access the right tools.
          </p>

          {/* Role Toggle */}
          <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-800">
            {signupRoles.map((signupRole) => (
              <button
                key={signupRole}
                type="button"
                onClick={() => setRole(signupRole)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  role === signupRole
                    ? "bg-white text-black"
                    : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                {signupRole === "USER" ? "User" : "Vendor"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Name Field */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-400 mb-1"
              >
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </motion.div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-400 mb-1"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="youremail@yourdomain.com"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-400 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter a password"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {role === "VENDOR" && (
              <div>
                <label
                  htmlFor="services"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Services Offered
                </label>
                <textarea
                  id="services"
                  value={servicesInput}
                  onChange={(event) => setServicesInput(event.target.value)}
                  placeholder="e.g. Document Printing, Laptop Repair"
                  className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate each service with a comma.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-black font-bold py-3 rounded-md hover:bg-gray-200 transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating account..." : "Sign up"}
            </button>
          </form>

          {/* Toggle Link */}
          <p className="text-center text-sm text-gray-400 mt-8">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-white hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* --- Right Column: Background Effect (Half width, full height) --- */}
      <div className="hidden md:flex md:w-1/2"></div>
    </div>
  );
}
