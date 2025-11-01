"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";

// --- Main Signup Page Component ---
export function SignupPage() {
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
            We empower developers and technical teams to create, simulate, and
            manage AI-driven workflows visually
          </p>

          {/* Form */}
          <form className="flex flex-col gap-4">
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
                  placeholder="Enter your name"
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
                  placeholder="youremail@yourdomain.com"
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
                  placeholder="Enter a password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-3 rounded-md hover:bg-gray-200 transition-colors mt-4"
            >
              Sign up
            </button>
          </form>

          {/* Toggle Link */}
          <p className="text-center text-sm text-gray-400 mt-8">
            Already have an account?{" "}
            <a
              href="/login" // Simple link to the login page
              className="font-semibold text-white hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>

      {/* --- Right Column: Background Effect (Half width, full height) --- */}
      <div className="hidden md:flex md:w-1/2"></div>
    </div>
  );
}
