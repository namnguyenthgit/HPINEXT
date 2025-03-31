import MobileNav from "@/components/MobileNav";
import { TransitionProvider } from "@/components/PageTransition";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { appConfig } from "@/lib/appconfig";
import Image from "next/image";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //const loggIn = { firstName: "uN70ve", lastName: "Fusion" };
  const loggedIn = await getLoggedInUser();
  const applogo = appConfig.icon;
  //console.log("Logged-in user:", loggedIn); // Check if user is correctly fetched

  return (
    <main className="flex h-screen w-full font-inter">
      <Sidebar user={loggedIn} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src={applogo} width={30} height={30} alt="logo" />
          <div>
            <MobileNav user={loggedIn} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {" "}
          <TransitionProvider>{children}</TransitionProvider>
        </div>
      </div>
    </main>
  );
}
