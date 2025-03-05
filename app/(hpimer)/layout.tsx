export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen w-full justify-between font-inter">
      {children}
      {/* <div className="auth-asset">
        <div>
          <Image src="/icons/auth-image.svg" alt="Auth Image" width={500} height={50} />
        </div>
      </div> */}
    </main>
  );
}
