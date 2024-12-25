"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import CustomInput from "./CustomInput";
import { authFormSchema } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/actions/user.actions";
import { appConfig } from "@/lib/appconfig";

const AuthForm = ({ type }: { type: string }) => {
  const apptitle = appConfig.title;
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setIsLoading(true);
    setError(null); // Clear any previous errors
    try {
      //sign up with Appwrite & create plain link token
      if (type === "sign-up") {
        const userData = {
          firstName: data.firstName!,
          lastName: data.lastName!,
          email: data.email,
          password: data.password,
        };
        const response = await signUp(userData);

        // Check if the response is an error
        if (response && "code" in response) {
          setError(response.message || "Failed to create account");
          return;
        } else {
          setUser(response);
        }
      }

      if (type === "sign-in") {
        const response = await signIn({
          email: data.email,
          password: data.password,
        });
        console.log("AuthForm-onSubmit-SignIn response:", response);
        // Early return if response is undefined or null
        if (!response) {
          setError("No response from server");
          return;
        }

        // Handle verification error
        if ("code" in response && response.type === "email_not_verified") {
          setError(
            "Please verify your email before accessing the application."
          );
          return;
        }

        // Handle error response
        if ("code" in response) {
          setError(response.message || "Invalid credentials");
          return;
        }

        // Only execute these if there was no error
        setError(null);
        router.push("/");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-form">
      <header className="flex flex-col items-center gap-5 md:gap-8">
        <Link href="/" className="cursor-pointer flex items-center gap-1">
          <Image src="/icons/logo.svg" width={34} height={34} alt="app logo" />
          <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">
            {apptitle}
          </h1>
        </Link>
      </header>
      <div className="round-xl rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col items-center gap-1 md:gap-3 pb-4">
          <h1 className="text-24 lg:text-36 font-semibold text-gray-900">
            {user
              ? "Sucessfully!!!"
              : type === "sign-in"
              ? "Sign In"
              : "Sign Up"}
          </h1>
          <p className="text-16 font-normal text-gray-600">
            {user
              ? "Press continue to enter homepage"
              : "Please enter your details"}
          </p>
        </div>
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <Link className="form-link" href="/">
              continue
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
                    disabled={isLoading}
                    className="form-btn"
                  >
                    {isLoading ? (
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
                  {error && <p style={{ color: "red" }}>{error}</p>}{" "}
                  {/* Display error message */}
                </div>
              </form>
            </Form>
            <footer className="flex justify-center gap-1 pt-4">
              <p className="text-14 font-normal text-gray-600">
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
