import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox, // Change this to `development` or `production` as needed
  baseOptions: {
    headers: {
      'plaid-client-id': process.env.PLAID_CLIENT_ID, // Correct casing
      'plaid-secret': process.env.PLAID_SECRET,       // Correct casing
    },
  },
});

export const plaidClient = new PlaidApi(configuration);