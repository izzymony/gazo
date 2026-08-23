/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import SignInOverview from "@/features/auth/signin/SignInOverview";
import useAuthStore from "@/store/authStore";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SignIn = () => {
  const searchParams = useSearchParams();
  const { socialCallback, authtypes } = useAuthStore();
  const code = searchParams.get("code") as string;

  const caller = async () => {
    return socialCallback(code, authtypes as any, () => { });
  };

  useEffect(() => {
    if (code) {
      caller();
    }
  }, [code]);

  return <SignInOverview />;
};

export default SignIn;