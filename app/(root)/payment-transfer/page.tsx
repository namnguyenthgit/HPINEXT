// app/(root)/payment-payportal/page.tsx
import HeaderBox from "@/components/HeaderBox";
import PaymentPayportal from "@/components/PaymentPayportal";
import { SearchParamProps } from "@/types";

export const dynamic = "force-dynamic";

const Page = async ({ searchParams }: SearchParamProps) => {
  const searchParamsAwaited = await searchParams;
  return (
    <section className="payment-payportal p-5">
      <HeaderBox
        title="Pay Portals"
        subtext="Please provide any specific details or notes related to the payment portals"
      />
      <div>
        <PaymentPayportal searchParams={searchParamsAwaited} />
      </div>
    </section>
  );
};

export default Page;
