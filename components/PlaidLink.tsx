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
  updateLinkToken,
} from "@/lib/actions/user.actions";
import Image from "next/image";
import { RefreshCcw } from "lucide-react";

interface PlaidLinkProps {
  user: User;
  variant?: "primary" | "ghost" | "default";
  accessToken?: string; // Add this for update functionality
  onSuccess?: () => void;
}

const PlaidLink = ({
  user,
  variant = "default",
  accessToken,
  onSuccess,
}: PlaidLinkProps) => {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLinkToken = async () => {
      setIsLoading(true);
      try {
        const response = accessToken
          ? await updateLinkToken(user, accessToken)
          : await createLinkToken(user);

        if (response?.linkToken) {
          setLinkToken(response.linkToken);
        } else {
          console.error("Failed to fetch link token", response);
        }
      } catch (error) {
        console.error("Error fetching link token:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkToken();
  }, [user, accessToken]);

  const handleSuccess = useCallback(
    async (public_token: string) => {
      try {
        if (accessToken) {
          // For updates, we don't need to exchange the token
          if (onSuccess) onSuccess();
        } else {
          // For new connections, exchange the token
          await exchangePublicToken({ publicToken: public_token, user });
        }
        router.refresh();
      } catch (error) {
        console.error("Error in Plaid success handler:", error);
      }
    },
    [router, user, accessToken, onSuccess]
  );

  // Use Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    onSuccess: handleSuccess,
    onExit: (err, metadata) => {
      if (err) console.error("Plaid Link Error:", err);
      setIsLoading(false);
    },
  });

  // Render update button if accessToken is provided
  if (accessToken) {
    return (
      <Button
        onClick={() => open()}
        disabled={!ready || isLoading}
        variant="outline"
        className="w-full flex items-center justify-center gap-2"
      >
        <RefreshCcw className="w-4 h-4" />
        Update Bank Connection
      </Button>
    );
  }

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
