import HeaderBox from "@/components/HeaderBox";
import { Pagination } from "@/components/Pagination";
import TransactionsTable from "@/components/TransactionsTable";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { formatAmount } from "@/lib/utils";
import { SearchParamProps } from "@/types";
import { redirect } from "next/navigation";
import React from "react";

const TransactionHistory = async ({ searchParams }: SearchParamProps) => { 
   // Await the searchParams  
  const params = await searchParams;  
  const currentPage = Number(params.page as string) || 1;

  //const loggedIn = {name: "uN70v3 Fusion", email: "uN70v3@gmail.com",};
  const loggedIn = await getLoggedInUser();
  //console.log('root-page loggedIn:',loggedIn);
  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  // Add null check for loggedIn user  
  if (!loggedIn) {  
    redirect("/sign-in");  
    // The code won't execute past this point after redirect  
  }

  if (!accounts) return null;
  const accountsData = accounts?.data;
  const appwriteItemId = (params.id as string) || accountsData[0]?.appwriteItemId;
  const account = await getAccount({ appwriteItemId });

  const rowsPerPage = 10;
  const totalPages = Math.ceil(account?.transactions.length / rowsPerPage);
  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
  const currentTransactions = account?.transactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">
              {account?.data.name}
            </h2>
            <p className="text-14 text-blue-25">
              {account?.data.officialName}{" "}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {account?.data.mask}
            </p>
          </div>

          <div className="transactions-account-balance">
            <p className="text-14">Current balance</p>
            <p className="text-14 text-center font-bold">
              {formatAmount(account?.data.currentBalance)}
            </p>
          </div>
        </div>

        <section className="flex w-full flex-col gap-6">
          <TransactionsTable transactions={currentTransactions} />
          {totalPages > 1 && (
            <div className="my-4 w-full">
              <Pagination totalPages={totalPages} page={currentPage} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TransactionHistory;
