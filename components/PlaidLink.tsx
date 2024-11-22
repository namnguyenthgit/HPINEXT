import React, { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  PlaidLinkOnSuccess,
  PlaidLinkOptions,
  usePlaidLink,
} from "react-plaid-link";
import { useRouter } from "next/navigation";
import {
  createLinkToken,
  exchangePublicToken,
} from "@/lib/actions/user.actions";
import Image from "next/image";

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  useEffect(() => {
    const fetchLinkToken = async () => {
      const response = await createLinkToken(user);
      console.log("Link Token Response:", response); // Debugging
      if (response?.linkToken) {
        setLinkToken(response.linkToken); // Set the token correctly
      } else {
        console.error("Failed to fetch link token", response); // Log full response
      }
    };

    fetchLinkToken();
  }, [user]);

  // Use Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    onSuccess: useCallback(
      async (public_token: string) => {
        console.log("Public token:", public_token);
        // Replace with your token exchange function
        await exchangePublicToken({ publicToken: public_token, user });
        router.push("/");
      },
      [router, user]
    ),
  });

  return (
    <>
      {variant === "primary" ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className="plaidlink-primary"
        >
          Connect bank
        </Button>
      ) : variant === "ghost" ? (
        <Button
          onClick={() => open()}
          variant="ghost"
          className="plaidlink-ghost"
        >
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
            className="size-[24px] max-xl:size-14"
          />
          <p className="hidden text-[16px] font-semibold text-black-2 xl:block">
            Connect bank
          </p>
        </Button>
      ) : (
        <Button onClick={() => open()} className="plaidlink-default">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
            className="size-[24px] max-xl:size-14"
          />
          <p className="text-[16px] font-semibold text-black-2">Connect bank</p>
        </Button>
      )}
    </>
  );
};

export default PlaidLink;
