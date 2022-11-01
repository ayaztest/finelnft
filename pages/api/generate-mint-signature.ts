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
  const [version] = await client.accessSecretVersion({ name });

  // Extract the payload as a string.
  const payload = version.payload?.data?.toString();

  // WARNING: Do not print the secret in a production environment - this
  // snippet is showing how to access the secret material.
  //console.info(`Payload: ${payload}`);

  return payload;
}

export default async function generateMintSignature(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // De-construct body from request
  const { address, quantity } = JSON.parse(req.body);

  try {
    // Get the Early Access NFT Drop contract
    const polygonSDK = new ThirdwebSDK('polygon'); // change to real chain of wolfer NFT
    const earlyAccessNfts = await polygonSDK.getContract(
      '0xCe8A6E03e6996f259191a18c4E2Aa398319b04E9',
      'nft-drop',
    ); // change to real smart contract address of wolfer NFT

    let userHasToken = false;
    // Check each token in the Edition Drop
    const balance = await earlyAccessNfts.balanceOf(address);
    console.log({ earlyAccessNfts, balance: balance.toString() });
    if (balance.toNumber() > 0) {
      userHasToken = true;
    }

    const PRIVATE_KEY = await accessSecretVersion();

    if (!PRIVATE_KEY) {
      console.error('Missing ADMIN_PRIVATE_KEY environment variable');
      return res.status(500).json({
        error: 'Admin private key not set',
      });
    }

    const BinanceSmartChainMainnetSDK = ThirdwebSDK.fromPrivateKey(
      PRIVATE_KEY.toString(),
      'binance',
    );

    const signatureDrop = await BinanceSmartChainMainnetSDK.getContract(
      '0x1615600fE62ed38342F82eb9785029A2b1290DAF',
      'signature-drop',
    );

    // If the user has an early access NFT, generate a mint signature
    if (userHasToken) {
      const mintSignature = await signatureDrop.signature.generate({
        to: address, // Can only be minted by the address we checked earlier
        quantity: quantity,
        price: parseInt(quantity) < 3 ? '225' : '200',
        currencyAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        mintStartTime: new Date(0), // now
      });
      res.status(200).json(mintSignature);
    } else {
      res.status(400).json({
        message: 'User does not have an early access Wolfer NFT',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: (error as Error).message,
    });
  }
}
