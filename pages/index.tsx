import {
  useAddress,
  useMetamask,
  useSignatureDrop,
  useNetwork,
  useNetworkMismatch,
  ConnectWallet,
} from "@thirdweb-dev/react";

import {
  ChainId,
  SignedPayload721WithQuantitySignature,
} from "@thirdweb-dev/sdk";
import type { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { useState } from "react";

const Home: NextPage = () => {
  const [quantity, setQuantity] = useState(1); // default to 1
  const address = useAddress();
  const connectWithMetamask = useMetamask();
  const isMismatch = useNetworkMismatch();
  const [, switchNetwork] = useNetwork();

  const signatureDrop = useSignatureDrop(
    "0x1615600fE62ed38342F82eb9785029A2b1290DAF"
  );

  async function claimWithSignature() {
    if (!address) {
      connectWithMetamask();
      return;
    }

    if (isMismatch) {
      switchNetwork && switchNetwork(ChainId.BinanceSmartChainMainnet);
      return;
    }

    const signedPayloadReq = await fetch(`/api/generate-mint-signature`, {
      method: "POST",
      body: JSON.stringify({
        address: address,
        quantity: quantity,
      }),
    });

    console.log(signedPayloadReq);

    if (signedPayloadReq.status === 400) {
      alert(
        "Looks like you don't own an Wolfer Finance NFT :( You don't qualify for the free mint."
      );
      return;
    } else {
      try {
        const signedPayload =
          (await signedPayloadReq.json()) as SignedPayload721WithQuantitySignature;

        console.log(signedPayload);

        const nft = await signatureDrop?.signature.mint(signedPayload);

        alert(`Succesfully minted NFT!`);
      } catch (error: any) {
        alert(error?.message);
      }
    }
  }

  return (
    <div className={styles.container}>
      {/* Top Section */}
      <h1 className={styles.h1}>PreSend Retail Investors</h1>
      <p className={styles.describe}>
        In this Round, users who own one of our{" "}
        <a href="https://opensea.io/collection/wfwolfpack">
          Wolfer Finance Wolfpack Nfts
        </a>{" "}
        can mint for a Big Discount. However, for those who don&apos;t own an
        Wolfer Finance Wolfpack NFT, they can still mint using the regular claim
        round.
      </p>
      {address ? (
        <div className={styles.nftBoxGrid}>
          {/* Mint a new NFT */}
          <p>Quantity</p>
          <div className={styles.quantityContainer}>
            <button
              className={`${styles.quantityControlButton}`}
              onClick={() => setQuantity(quantity - 1)}
              disabled={quantity <= 1}
            >
              -
            </button>

            <h4>{quantity}</h4>

            <button
              className={`${styles.quantityControlButton}`}
              onClick={() => setQuantity(quantity + 1)}
              disabled={quantity >= 10}
            >
              +
            </button>
          </div>

          <div
            className={styles.optionSelectBox}
            role="button"
            onClick={() => claimWithSignature()}
          >
            <img
              src={"logo.png"}
              alt="signature-mint"
              className={styles.cardImg}
            />
            <h2 className={styles.selectBoxTitle}>Mint with WolfPack</h2>
            <p className={styles.selectBoxDescription}>
              1 or 2 NFTs are priced at 225 and minting 3 or more at once gives
              you even more discount at 200 each nft. Hurry up now before this
              offer is over.
            </p>
          </div>
        </div>
      ) : (
        <p>Please Connect Wallet Below</p>
      )}{" "}
      <div className={styles.margintop}>
        <ConnectWallet
          // Some customization of the button style
          colorMode="light"
          accentColor="#F213A4"
        />
      </div>
    </div>
  );
};

export default Home;
