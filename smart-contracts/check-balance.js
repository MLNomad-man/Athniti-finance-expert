require('dotenv').config();
const algosdk = require('algosdk');

const algodClient = new algosdk.Algodv2(
  '',
  'https://testnet-api.algonode.cloud',
  443
);

async function checkBalance() {
  const address = process.env.ALGO_ADDRESS;

  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    const balanceAlgo = Number(accountInfo.amount) / 1_000_000;

    console.log('Address:', address);
    console.log('Balance:', balanceAlgo, 'ALGO');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkBalance();