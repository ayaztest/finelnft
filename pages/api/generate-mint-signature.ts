import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import type { NextApiRequest, NextApiResponse } from "next";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
export default async function generateMintSignature(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // De-construct body from request
  const { address } = JSON.parse(req.body);
  const { quantity } = JSON.parse(req.body);

  // Get the Early Access NFT Drop contract
  const polygonSDK = new ThirdwebSDK("mumbai"); // change to real chain of wolfer NFT
  const earlyAccessNfts = polygonSDK.getNFTDrop(
    "0xC1e999eD13297bcd4216281cf0524441abA1711a"
  ); // change to real smart contract address of wolfer NFT

  let userHasToken = false;
  // Check each token in the Edition Drop
  const balance = await earlyAccessNfts.balanceOf(address);
  if (balance.toNumber() > 0) {
    userHasToken = true;
  }

  const name = process.env.GOOGLE_SECRET_NAME;

  // Instantiates a client
   const client = new SecretManagerServiceClient({
    credentials: {
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
  });
  async function accessSecretVersion() {
    const [version] = await client.accessSecretVersion({
      name: name,
    });

    // Extract the payload as a string.
    const payload = version.payload?.data?.toString();

    // WARNING: Do not print the secret in a production environment - this
    // snippet is showing how to access the secret material.
    //console.info(`Payload: ${payload}`);

    return payload;
  }

  const PRIVATE_KEY = await accessSecretVersion();
  //console.log("found key: " + PRIVATE_KEY);

  if (!PRIVATE_KEY) {
    console.error("Missing ADMIN_PRIVATE_KEY environment variable");
    return res.status(500).json({
      error: "Admin private key not set",
    });
  }

  //const sdk = ThirdwebSDK.fromPrivateKey(PRIVATE_KEY.toString(), "binance");

  const BinanceSmartChainMainnetSDK = ThirdwebSDK.fromPrivateKey(
    PRIVATE_KEY.toString(),
    "binance"
  );

  const signatureDrop = BinanceSmartChainMainnetSDK.getSignatureDrop(
    "0xE62d775E3Cc91659034dFC3b09a46259D6942c2c"
  );

  // If the user has an early access NFT, generate a mint signature
  if (userHasToken) {
    const mintSignature = await signatureDrop.signature.generate({
      to: address, // Can only be minted by the address we checked earlier
      quantity: quantity,
      price: parseInt(quantity) < 3 ? "3" : "1",
      currencyAddress: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      mintStartTime: new Date(0), // now
    });
    res.status(200).json(mintSignature);
  } else {
    res.status(400).json({
      message: "User does not have an early access Wolfer NFT",
    });
  }
}

