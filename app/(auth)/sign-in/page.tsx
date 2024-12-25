import AuthForm from "@/components/AuthForm";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";

const SignIn = async () => {
  // Check if the user is logged in
  const loggedIn = await getLoggedInUser();
  //console.log("Logged in user data:", loggedIn);

  // Check if loggedIn is an error response (has code property)
  if (loggedIn && "code" in loggedIn) {
    console.log("SignIn Page get LoggedIn error:", loggedIn);
    return (
      <section className="flex-center size-full max-sm:px-6">
        <AuthForm type="sign-in" />
      </section>
    );
  }

  // Only redirect if we have a valid user object with required properties
  if (loggedIn && loggedIn.$id) {
    console.log("Valid user found, redirecting...");
    redirect("/");
  }

  return (
    <section className="flex-center size-full max-sm:px-6">
      <AuthForm type="sign-in" />
    </section>
  );
};

export default SignIn;
