// app/(admin)/backup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  appwriteRestoreData,
  backupDatabaseAndAuth,
  type appwriteDatabaseBackup,
} from "@/lib/appwrite/appwrite.actions";

type MessageType = "success" | "error" | "info";

interface StatusMessage {
  text: string;
  type: MessageType;
}

interface BackupStats {
  collections?: number;
  documents?: number;
  users?: number;
}

export default function BackupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [stats, setStats] = useState<BackupStats>({});

  const showMessage = (text: string, type: MessageType) => {
    setMessage({ text, type });
    if (type === "success" || type === "info") {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const backupData = await backupDatabaseAndAuth();

      // Create downloadable file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appwrite-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Update stats
      setStats({
        collections: Object.keys(backupData.collections).length,
        documents: Object.values(backupData.collections).reduce(
          (acc, curr) => acc + curr.documents.length,
          0
        ),
        users: backupData.users.length,
      });

      showMessage("Backup completed successfully!", "success");
    } catch (error) {
      console.error("Backup error:", error);
      if (error instanceof Error && error.message.includes("No session")) {
        router.push("/auth/login");
        return;
      }
      showMessage("Failed to create backup. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      showMessage("File size exceeds 50MB limit", "error");
      event.target.value = "";
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent) as appwriteDatabaseBackup;

      // Show warning message before proceeding
      if (
        !window.confirm(
          "Warning: Restoring a backup will overwrite existing data. Are you sure you want to proceed?"
        )
      ) {
        event.target.value = "";
        return;
      }

      const result = await appwriteRestoreData(backupData);

      setStats({
        documents: result.stats.documents,
        users: result.stats.users,
      });

      showMessage(
        result.errors?.length
          ? `Restore completed with ${result.errors.length} errors. Check console for details.`
          : "Restore completed successfully!",
        result.errors?.length ? "info" : "success"
      );

      if (result.errors?.length) {
        console.error("Restore errors:", result.errors);
      }
    } catch (error) {
      console.error("Restore error:", error);
      if (error instanceof Error && error.message.includes("No session")) {
        router.push("/auth/login");
        return;
      }
      showMessage(
        "Failed to restore backup. Please check the file format.",
        "error"
      );
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Database & Auth Backup
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Create and restore backups of your database and user data
        </p>
      </div>

      <div className="space-y-6">
        {/* Backup Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create Backup
          </h2>
          <button
            onClick={handleBackup}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent   
                                 text-sm font-medium rounded-md shadow-sm text-white   
                                 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2   
                                 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50   
                                 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
            ) : (
              <ArrowDownToLine className="-ml-1 mr-2 h-4 w-4" />
            )}
            {isLoading ? "Processing..." : "Create Backup"}
          </button>
        </div>

        {/* Restore Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Restore Backup
          </h2>
          <label className="block">
            <span className="sr-only">Choose backup file</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestore}
              disabled={isLoading}
              className="block w-full text-sm text-slate-500  
                                file:mr-4 file:py-2 file:px-4  
                                file:rounded-md file:border-0  
                                file:text-sm file:font-semibold  
                                file:bg-blue-50 file:text-blue-700  
                                hover:file:bg-blue-100  
                                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </label>
          <p className="mt-2 text-sm text-gray-500">
            Maximum file size: 50MB. Only JSON files are supported.
          </p>
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-start space-x-2 ${
              message.type === "error"
                ? "bg-red-50 text-red-700"
                : message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {message.type === "error" ? (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Statistics */}
        {(stats.collections !== undefined ||
          stats.documents !== undefined ||
          stats.users !== undefined) && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.collections !== undefined && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm font-medium text-gray-500">
                    Collections
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.collections}
                  </div>
                </div>
              )}
              {stats.documents !== undefined && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm font-medium text-gray-500">
                    Documents
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.documents}
                  </div>
                </div>
              )}
              {stats.users !== undefined && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="text-sm font-medium text-gray-500">Users</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.users}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
