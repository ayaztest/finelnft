import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import type { NextApiRequest, NextApiResponse } from 'next';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function accessSecretVersion() {
  const name = process.env.GOOGLE_SECRET_NAME;
  // Instantiates a client
  const client = new SecretManagerServiceClient({
    credentials: {
      private_key: process?.env?.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
  });
  try {
    const [version] = await client.accessSecretVersion({ name });
  
    // Extract the payload as a string.
    const payload = version.payload?.data?.toString();
  
    // WARNING: Do not print the secret in a production environment - this
    // snippet is showing how to access the secret material.
    //console.info(`Payload: ${payload}`);
  
    return payload;
  } catch (error) {
    console.error(`Theres's been an error accessing the secret version: ${error}`);
  }
}

export default async function generateMintSignature(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // De-construct body from request
  const { address, quantity } = JSON.parse(req.body);

  try {
    const PRIVATE_KEY = await accessSecretVersion();

    if (!PRIVATE_KEY) {
      console.error('Missing ADMIN_PRIVATE_KEY environment variable');
      return res.status(500).json({
        error: 'Admin private key not set',
      });
    }

    const binanceSmartChainMainnetSDK = ThirdwebSDK.fromPrivateKey(
      PRIVATE_KEY.toString(),
      'binance',
    );

    const signatureDrop = await binanceSmartChainMainnetSDK.getContract(
      '0x1615600fE62ed38342F82eb9785029A2b1290DAF',
      'signature-drop',
    );

    // Get the Early Access NFT Drop contract
   const polygonSDK = new ThirdwebSDK("polygon");
  const earlyAccessNfts = await polygonSDK.getContract(
    "0x2eb6648815074820094578dE9DC8F2e583b85F46",
    'nft-drop'
  ); // change to real smart contract address of wolfer NFT

    let userHasToken = false;
    // Check each token in the NFT Drop
    const balance = await earlyAccessNfts?.balanceOf(address);
    if (balance.toNumber() > 0) {
      userHasToken = true;
    }

    const price = parseInt(quantity) >= 3 ? '200' : '225';

    // If the user has an early access NFT, generate a mint signature
    if (userHasToken) {
      console.log("User has token!")
      const mintSignature = await signatureDrop?.signature.generate({
        to: address, // Can only be minted by the address we checked earlier
        quantity,
        price,
        currencyAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
      });
      res.status(200).json(mintSignature);
    } else {
      console.log("User doesn't have token!")
      res.status(400).json({
        message: 'User does not have an early access Wolfer NFT',
      });
    }
  } catch (error) {
    console.log("Something went wrong.")
    console.error(error);
    res.status(500).json({
      error: (error as Error).message,
    });
  }
}
