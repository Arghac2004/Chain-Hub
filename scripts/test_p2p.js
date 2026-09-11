const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xB0C7AE3F267aAa4bCDCfcA9388ED7aE4259D2541";
  const p2p = await ethers.getContractAt("SepoliaP2PEscrow", contractAddress);

  const admin = await p2p.admin();
  const isStarted = await p2p.isStarted();
  const totalOrders = await p2p.totalOrders();
  const expireTime = await p2p.p2pExpireTime();
  const asset0 = await p2p.assetType(0);
  const asset1 = await p2p.assetType(1);
  const asset2 = await p2p.assetType(2);
  const deployerKyc = await p2p.getUserData(admin);

  console.log("==================================================");
  console.log("🔍 LIVE SEPOLIA SMART CONTRACT AUDIT REPORT");
  console.log("==================================================");
  console.log(" Contract Address :", contractAddress);
  console.log(" Admin Address    :", admin);
  console.log(" Is Started       :", isStarted);
  console.log(" Total Orders     :", totalOrders.toString());
  console.log("⏱ Expire Time      :", expireTime.toString(), "seconds (2 Hours)");
  console.log(" Asset Pair 0     :", asset0, "(Native Coin)");
  console.log(" Asset Pair 1     :", asset1, "(Token 1)");
  console.log(" Asset Pair 2     :", asset2, "(Token 2)");
  console.log(" Admin KYC Status :", deployerKyc._kycStatus ? "VERIFIED" : "NOT VERIFIED");
  console.log(" Admin Country ID :", deployerKyc._countryID.toString());
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
