// app/(admin)/layout.tsx
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    );
  } catch (error) {
    console.error(error);
    redirect("/sign-in");
  }
}
