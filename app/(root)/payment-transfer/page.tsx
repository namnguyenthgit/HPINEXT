import HeaderBox from "@/components/HeaderBox";
import PaymentTransferForm from "@/components/PaymentTransferForm";
import PayPortalTransferForm from "@/components/PayPortalTransferForm";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import React from "react";

const Transfer = async () => {
  //const loggedIn = {name: "uN70v3 Fusion", email: "uN70v3@gmail.com",};
  const loggedIn = await getLoggedInUser();
  //console.log("payment-transfer-page loggedIn:", loggedIn);

  // const accounts = await getAccounts({
  //   userId: loggedIn.$id,
  // });

  //if (!accounts) return null;
  //const accountsData = accounts?.data;

  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Pay Portals"
        subtext="Please provide any specific details or notes related to the payment portals"
      />

      <section className="size-full pt-5">
        {/* <PaymentTransferForm accounts={accountsData} /> */}
        <PayPortalTransferForm email={loggedIn.email} />
      </section>
    </section>
  );
};

export default Transfer;
