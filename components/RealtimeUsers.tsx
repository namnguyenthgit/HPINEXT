"use client";

import { client, databases } from "@/lib/appwrite-client";
import { RealtimeResponseEvent, Models } from "appwrite";
import { useState, useEffect } from "react";

// Define User type extending Appwrite's Models.Document
type User = Models.Document & {
  email: string;
  userId: string;
  dwollaCustomerUrl: string;
  dwollaCustomerId: string;
  firstName: string;
  lastName: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
};

interface RealtimeUsersProps {
  initialUsers: User[];
}

// Type for Appwrite realtime payload
interface RealtimePayload extends Models.Document {
  [key: string]: unknown;
}

export default function RealtimeUsers({ initialUsers }: RealtimeUsersProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    let unsubscribe: () => void;

    const setupRealtimeSubscription = () => {
      unsubscribe = client.subscribe(
        [
          `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_USER_COLLECTION_ID}.documents`,
        ],
        (response: RealtimeResponseEvent<RealtimePayload>) => {
          console.log("Realtime event received:", response);

          if (
            response.events.includes(
              "databases.*.collections.*.documents.create"
            )
          ) {
            // Fetch the new document directly
            databases
              .getDocument<User>( // Add generic type here
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_USER_COLLECTION_ID!,
                response.payload.$id
              )
              .then((newUser) => {
                setUsers((prev) => [...prev, newUser]);
              })
              .catch((error) => {
                console.error("Error fetching new user:", error);
              });
          }

          if (
            response.events.includes(
              "databases.*.collections.*.documents.update"
            )
          ) {
            setUsers((prev) =>
              prev.map((user) =>
                user.$id === response.payload.$id
                  ? { ...user, ...(response.payload as Partial<User>) }
                  : user
              )
            );
          }

          if (
            response.events.includes(
              "databases.*.collections.*.documents.delete"
            )
          ) {
            setUsers((prev) =>
              prev.filter((user) => user.$id !== response.payload.$id)
            );
          }
        }
      );
    };

    // Initial subscription setup
    setupRealtimeSubscription();

    // Handle reconnection
    const handleReconnect = () => {
      console.log("Attempting to reconnect...");
      if (unsubscribe) {
        unsubscribe();
      }
      setupRealtimeSubscription();
    };

    // Listen for connection status changes
    const connectedUnsubscribe = client.subscribe("connected", () => {
      console.log("Connected to Appwrite realtime");
    });

    const disconnectedUnsubscribe = client.subscribe("disconnected", () => {
      console.log("Disconnected from Appwrite realtime");
      setTimeout(handleReconnect, 1000);
    });

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      connectedUnsubscribe();
      disconnectedUnsubscribe();
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Users ({users.length})</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <div
            key={user.$id}
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-gray-600">{user.email}</p>
            <div className="mt-2 text-sm text-gray-500">
              <p>{user.address1}</p>
              <p>
                {user.city}, {user.state} {user.postalCode}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
