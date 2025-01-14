import { logoutAccount } from "@/lib/actions/user.actions";
import { FooterProps } from "@/types";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const Footer = ({ user, type = "desktop" }: FooterProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogOut = async () => {
    try {
      setIsLoading(true);
      const response = await logoutAccount();
      if (response.success) {
        router.refresh();
        router.push("/sign-in");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Log out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="footer">
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"}>
        <p className="text-xl font-bold text-gray-700">{user?.firstName[0]}</p>
      </div>

      <div
        className={type === "mobile" ? "footer_email-mobile" : "footer_email"}
      >
        <h1 className="text-14 truncate font-semibold text-gray-600">
          {user?.firstName}
        </h1>
        <p className="text-14 truncate font-normal text-gray-600">
          {user?.email}
        </p>
      </div>

      <button
        className="footer_image relative"
        onClick={handleLogOut}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Image
            src="/icons/logout.svg"
            fill
            alt="logout"
            className="cursor-pointer"
          />
        )}
      </button>
    </footer>
  );
};

export default Footer;
