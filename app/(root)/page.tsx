import HeaderBox from "@/components/HeaderBox";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { SearchParamProps } from "@/types";
import { redirect } from "next/navigation";
import React from "react";

const Home = async (props: SearchParamProps) => {
  // Get the searchParams after the component starts executing
  const { searchParams } = props;
  const params = await searchParams;

  // Move this logic after all async operations
  const loggedIn = await getLoggedInUser();

  // Add null check here
  if (!loggedIn) {
    console.log("User not logged in, redirecting to sign-in");
    redirect("/sign-in");
    // return null;
  }

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="welcome"
            user={loggedIn?.firstName || "Guest"}
            subtext="Access and manage your account and transactions efficiantly."
          />

          {/* <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          /> */}
        </header>
        {/* <RecentTransactions
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        /> */}
      </div>
      {/* <RightSidebar
        user={loggedIn}
        transactions={account?.transactions}
        banks={accountsData?.slice(0, 2)}
      /> */}
    </section>
  );
};

export default Home;
