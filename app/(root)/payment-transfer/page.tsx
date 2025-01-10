// app/(root)/payment-payportal/page.tsx
import PaymentPayportal from "@/components/PaymentPayportal";

interface PageProps {
  searchParams: {
    page?: string | string[];
    portal?: string | string[];
  };
}

const Page = async ({ searchParams }: PageProps) => {
  const searchParamsAwaited = await searchParams;
  return (
    <section className="size-full p-5">
      <PaymentPayportal searchParams={searchParamsAwaited} />
    </section>
  );
};

export default Page;
