"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomInput from "./CustomInput";
import { authFormSchema } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleSignIn, signIn, signUp } from "@/lib/actions/user.actions";
import { appConfig } from "@/lib/appconfig";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase.config";

const AuthForm = ({ type }: { type: string }) => {
  const apptitle = appConfig.title;
  const applogo = appConfig.icon;
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Add a separate loading state for Google sign-in
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Helper function to check if any auth process is in progress
  const isLoading = isPending || isGoogleLoading;

  const formSchema = authFormSchema(type);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues:
      type === "sign-up"
        ? {
            email: "",
            password: "",
            firstName: "",
            lastName: "",
          }
        : {
            email: "",
            password: "",
          },
  });

  // 2. Define a submit handler.
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    startTransition(async () => {
      try {
        if (type === "sign-up") {
          const response = await signUp({
            firstName: data.firstName!,
            lastName: data.lastName!,
            email: data.email,
            password: data.password,
          });

          if (response.success) {
            setSignupSuccess(true);
            setSuccessMessage(
              response.message ||
                "Account created successfully! Please verify your email."
            );
          } else {
            setError(response.message || "Failed to create account");
          }
        }

        if (type === "sign-in") {
          const response = await signIn({
            email: data.email,
            password: data.password,
          });

          if (!response) {
            setError("No response from server");
            return;
          }

          if ("code" in response) {
            switch (response.type) {
              case "email_not_verified":
                setError("Please verify your email before signing in.");
                break;
              case "invalid_credentials":
                setError("Invalid email or password");
                break;
              default:
                setError(response.message || "Authentication failed");
            }
            return;
          }

          // Successful login
          router.push(callbackUrl);
        }
      } catch (error) {
        console.log(error);
        setError("An unexpected error occurred");
      }
    });
  };

  const ErrorMessage = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
      <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm mt-2">
        {message}
      </div>
    );
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true); // Set Google loading state to true

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get the ID token
      const idToken = await user.getIdToken();
      //console.log("AuthForm-handleGoogleLogin-idToken:", idToken);
      // Call your backend to verify the token and create a session
      const response = await googleSignIn(idToken);

      if (response.code) {
        // Error occurred
        setError(response.message || "Google authentication failed");
        return;
      }

      // Success - redirect to the callback URL or dashboard
      console.log("Google login successful:", response.user?.email);
      console.log("callbackUrl:", callbackUrl);
      router.push(callbackUrl);
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);

      if (error instanceof Error && "code" in error) {
        if (error.code === "auth/popup-closed-by-user") {
          // User closed the popup, this is not an error
        } else if (error.code === "auth/popup-blocked") {
          setError(
            "Popup was blocked by your browser. Please allow popups for this site."
          );
        } else {
          setError(error.message || "Failed to sign in with Google");
        }
      } else {
        setError("Failed to sign in with Google");
      }
    } finally {
      setIsGoogleLoading(false); // Always reset Google loading state
    }
  };

  return (
    <section className="auth-form">
      <header className="flex flex-col gap-5 items-center md:gap-8">
        <Link href="/" className="flex cursor-pointer gap-1 items-center">
          <Image
            src={applogo}
            width={34}
            height={34}
            alt="app logo"
            priority={true}
            loading="eager"
            className="h-auto w-auto"
          />
          <h1 className="text-26 text-black-1 font-bold font-ibm-plex-serif">
            {apptitle}
          </h1>
        </Link>
      </header>
      <div className="border border-gray-200 p-6 rounded-xl shadow-lg round-xl">
        <div className="flex flex-col gap-1 items-center md:gap-3 pb-4">
          <h1 className="text-24 text-gray-900 font-semibold lg:text-36">
            {signupSuccess
              ? "Successfully!!!"
              : type === "sign-in"
              ? "Sign In"
              : "Sign Up"}
          </h1>
          <p className="text-16 text-gray-600 font-normal">
            {signupSuccess ? successMessage : "Please enter your details"}
          </p>
        </div>
        {signupSuccess ? (
          <div className="flex flex-col gap-4 items-center">
            <Link className="form-link" href="/sign-in">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {type === "sign-up" && (
                  <>
                    <div className="flex gap-4">
                      <CustomInput
                        control={form.control}
                        name="firstName"
                        label="First Name"
                        placeholder="Input first name"
                      />
                      <CustomInput
                        control={form.control}
                        name="lastName"
                        label="Last Name"
                        placeholder="Input last name"
                      />
                    </div>
                  </>
                )}
                <CustomInput
                  control={form.control}
                  name="email"
                  label="Email"
                  placeholder="Enter your Email"
                />
                <CustomInput
                  control={form.control}
                  name="password"
                  label="password"
                  placeholder="Enter your password"
                />
                <div className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading} // Disable during any authentication
                    className="form-btn"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={20} className="animate-spin" /> &nbsp;
                        Loading...
                      </>
                    ) : type === "sign-in" ? (
                      "Sign In"
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="light-btn"
                    onClick={handleGoogleLogin}
                    disabled={isLoading} // Disable during any authentication
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" /> &nbsp;
                        Loading...
                      </>
                    ) : (
                      <>
                        <Image
                          src="/icons/google.svg"
                          width={34}
                          height={34}
                          alt="app logo"
                          priority={true}
                          loading="eager"
                          className="h-auto w-auto"
                        />
                        Sign In with Google
                      </>
                    )}
                  </Button>
                  <ErrorMessage message={error} />
                </div>
              </form>
            </Form>
            <footer className="flex justify-center gap-1 pt-4">
              <p className="text-14 text-gray-600 font-normal">
                {type === "sign-in"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </p>
              <Link
                href={type === "sign-in" ? "/sign-up" : "/sign-in"}
                className="form-link"
              >
                {type === "sign-in" ? "Sign up" : "Sign in"}
              </Link>
            </footer>
          </>
        )}
      </div>
    </section>
  );
};

export default AuthForm;
