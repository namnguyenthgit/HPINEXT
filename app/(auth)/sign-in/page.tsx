import AuthForm from "@/components/AuthForm";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

const SignIn = async () => {
  // Check if the user is logged in
  const loggedIn = await getLoggedInUser();

   // If user is logged in, redirect to the home page (or dashboard, etc.)
   if (loggedIn) {
    redirect("/"); // Redirect to home or dashboard page
  }

  return (
    <section className="flex-center size-full max-sm:px-6">
      <AuthForm type="sign-in" />
    </section>
  );
};

export default SignIn;
