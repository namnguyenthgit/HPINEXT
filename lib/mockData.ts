// mockData.ts
export const mockAccounts: Account[] = [
    {
      id: "1",
      appwriteItemId: "appwriteItem1",
      name: "Bank A",
      balance: 1000,
    },
    {
      id: "2",
      appwriteItemId: "appwriteItem2",
      name: "Bank B",
      balance: 2000,
    },
  ];
  
  export const mockTransactions: Transaction[] = [
    {
      id: "txn1",
      date: "2024-11-22",
      description: "Grocery Store",
      amount: -50,
      type: "debit",
    },
    {
      id: "txn2",
      date: "2024-11-21",
      description: "Salary",
      amount: 2000,
      type: "credit",
    },
  ];
  