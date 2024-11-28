import { AddBank } from "@/components/AddBank";
import HeaderBox from "@/components/HeaderBox";

const addBank = async () => {
  return (
    <section className="payment-transfer">
      <HeaderBox title="Add Bank" subtext="Add your bank to manage" />

      <section className="size-full pt-5">
        <AddBank />
      </section>
    </section>
  );
};

export default addBank;
