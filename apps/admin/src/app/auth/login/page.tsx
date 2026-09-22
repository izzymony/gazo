"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Lock, Mail, Shield, Eye, User } from "lucide-react";
import { toast } from "sonner";
import useAdminAuthStore from "@/store/adminAuthStore";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import { H1, H2, Text } from "@/components/common/Typography";
import Logo from "@/components/common/Logo";

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading, error, clearError } = useAdminAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const email = watch("email");
  const password = watch("password");

  // Clear any persisted errors when login page mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    clearError(); // Clear any previous errors

    try {
      await login(data.email, data.password, rememberMe);
      toast.success("Login successful! Redirecting...");

      // Small delay to show success message before redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);

    } catch (error) {
      let errorMessage = "Login failed. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.error(errorMessage);
    }
  };


  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Two-factor auth is NOT implemented on the backend. Never grant access here —
    // fake-passing any 6-digit code would be a real security hole.
    toast.error("Two-factor authentication isn't available yet.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand/5 via-gray-50 to-brandLight/5">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <Logo width={180} height={32} className="mx-auto" />
            </div>
            <H2 className="text-base font-semibold text-brandDeep text-center">
              Admin Portal
            </H2>
          </div>

          {!showMFA ? (
            // Login Form
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 font-medium">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <InputField
                type="email"
                placeholder="Email Address"
                name="email"
                value={email}
                onChange={(e) => setValue("email", e.target.value)}
                error={errors.email?.message}
                isReadonly={isLoading}
                className="mb-4"
                mode="signin"
              />

              {/* Password Field */}
              <InputField
                type="password"
                placeholder="Password"
                name="password"
                value={password}
                onChange={(e) => setValue("password", e.target.value)}
                error={errors.password?.message}
                isReadonly={isLoading}
                className="mb-4"
                mode="signin"
              />

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-gray-300 text-brandDeep focus:ring-brandDeep focus:ring-offset-0 disabled:opacity-50"
                  />
                  <label htmlFor="remember" className="ml-3 text-sm font-medium text-gray-600">
                    Remember me (90 days)
                  </label>
                </div>
                <a href="#" className="text-sm text-brandDeep hover:text-brandDark font-medium transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brandDeep"></div>
                    <span className="text-sm">Authenticating...</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                loading={isLoading}
                loadingText="Signing in..."
                className="w-full"
              >
                <Shield className="mr-2 h-5 w-5 inline" />
                Sign In to Vibaar
              </Button>
            </form>
          ) : (
            // MFA Form
            <form onSubmit={handleMFASubmit} className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand/20 to-brandLight/20 rounded-xl mb-4">
                  <Shield className="h-8 w-8 text-brandDeep" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full py-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl tracking-widest font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="000000"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowMFA(false);
                    setMfaCode("");
                  }}
                  variant="bordered"
                  disabled={isLoading}
                  className="flex-1 mt-0"
                >
                  Back to Login
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || mfaCode.length !== 6}
                  loading={isLoading}
                  loadingText="Verifying..."
                  className="flex-1 mt-0"
                >
                  Verify & Continue
                </Button>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-4 w-4 text-brandDeep mr-2" />
              <span className="text-xs font-semibold text-brandDeep">Secure Admin Portal</span>
            </div>
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              This is a secure Vibaar administrative portal. All activities are logged and monitored.
              <br />
              Unauthorized access attempts will be reported to security team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}