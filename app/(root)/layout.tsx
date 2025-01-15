import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //const loggIn = { firstName: "uN70ve", lastName: "Fusion" };
  const loggedIn = await getLoggedInUser();
  //console.log("Logged-in user:", loggedIn); // Check if user is correctly fetched

  return (
    <main className="flex h-screen w-full font-inter">
      <Sidebar user={loggedIn} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          <div>
            <MobileNav user={loggedIn} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {" "}
          {/* Add this wrapper */}
          {children}
        </div>
      </div>
    </main>
  );
}
