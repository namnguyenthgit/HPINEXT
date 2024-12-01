import { AddBank } from "@/components/AddBank";
import BankCard from "@/components/BankCard";
import HeaderBox from "@/components/HeaderBox";
import PrivateBankCard from "@/components/PrivateBankCard";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser, getPrivateBanks } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import React from "react";

const MyBanks = async () => {
  //const loggedIn = {name: "uN70v3 Fusion", email: "uN70v3@gmail.com",};
  const loggedIn = await getLoggedInUser();
  //console.log('root-page loggedIn:',loggedIn);

  if (!loggedIn) {
    redirect("/sign-in");
  }

  // const accounts = await getAccounts({
  //   userId: loggedIn.$id,
  // });

  // Fetch both regular and private bank accounts  
  const [accounts, privateBanks] = await Promise.all([  
    getAccounts({  
      userId: loggedIn.$id,  
    }),  
    getPrivateBanks({  
      userId: loggedIn.$id,  
    }),  
  ]);

  return (
    <section className="flex">
      <div className="my-banks">
        <HeaderBox
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites."
        />
        <AddBank userId={loggedIn.$id} />
        <div className="space-y-4">
          <h2 className="header-2">Your cards</h2>
          <div className="flex flex-wrap gap-6">
            {/* Regular bank accounts */}  
            {accounts?.data.map((account: any) => (  
              <BankCard  
                key={account.appwriteItemId}  
                account={account}  
                userName={loggedIn?.firstName}  
                showBalance={true}  
              />  
            ))}  
            
            {/* Private bank accounts */}  
            {privateBanks?.map((account: any) => (  
              <PrivateBankCard  
                key={account.$id}  
                account={account}  
                userName={loggedIn?.firstName}  
                showBalance={true}  
              />  
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyBanks;
