const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  // Read current proxy address from frontend config
  let proxyAddress = "";
  const frontendContractsPath = path.join(__dirname, "../frontend/src/config/contracts.js");
  if (fs.existsSync(frontendContractsPath)) {
    const content = fs.readFileSync(frontendContractsPath, "utf-8");
    const match = content.match(/export const CAMPAIGN_FACTORY_ADDRESS = '(0x[a-fA-F0-9]{40})'/);
    if (match) {
      proxyAddress = match[1];
    }
  }

  if (!proxyAddress || proxyAddress === "0x0000000000000000000000000000000000000000") {
    console.error(" Please provide a valid Proxy Address in frontend/src/config/contracts.js or specify in this script.");
    return;
  }

  console.log("==================================================");
  console.log(" Upgrading Smart Contract Implementation...");
  console.log(" Permanent Proxy Address:", proxyAddress);
  console.log(" Upgrade Initiated by Owner:", deployer.address);
  console.log("==================================================");

  const CampaignFactoryV2 = await ethers.getContractFactory("CampaignFactory");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, CampaignFactoryV2);

  await upgraded.waitForDeployment();
  console.log(" Smart Contract Implementation Successfully Upgraded!");
  console.log(" All state, balances, and campaigns preserved at Proxy:", proxyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
