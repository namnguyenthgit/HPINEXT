import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, // Correct casing
      'PLAID-SECRET': process.env.PLAID_SECRET,       // Correct casing
    },
  },
});

export const plaidClient = new PlaidApi(configuration);