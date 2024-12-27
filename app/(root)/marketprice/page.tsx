import HeaderBox from "@/components/HeaderBox";
import MarketPriceList from "@/components/MarketPriceList";
import TradingViewChart from "@/components/TradingViewChart";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import React from "react";

const Transfer = async () => {
  const loggedIn = await getLoggedInUser();
  //console.log("marketprice-page loggedIn:", loggedIn);

  // const accounts = await getAccounts({
  //   userId: loggedIn.$id,
  // });

  //if (!accounts) return null;
  //const accountsData = accounts?.data;

  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Market Price"
        user={loggedIn?.firstName || "Guest"}
        subtext="Realtime market price"
      />

      <section className="size-full pt-5">
        <div className="w-full mx-auto">
          <h1 className="text-2xl font-bold mb-4">Market Charts</h1>

          {/* Crypto Examples */}
          <div className="mb-8">
            <h2 className="text-xl mb-4">Crypto Markets</h2>
            <TradingViewChart
              symbol="BTC/USDT"
              marketType="crypto"
              theme="dark"
              chartId="crypto-chart"
            />
          </div>

          {/* Forex Examples */}
          <div className="mb-8">
            <h2 className="text-xl mb-4">Forex Markets</h2>
            <TradingViewChart
              symbol="EUR/USD"
              marketType="forex"
              theme="dark"
              chartId="forex-chart"
            />
          </div>

          {/* Market Price List */}
          <div className="w-full mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Market Prices</h1>
            <MarketPriceList theme="dark" />
          </div>
        </div>
      </section>
    </section>
  );
};

export default Transfer;
