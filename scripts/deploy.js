const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("==================================================");
  console.log("🚀 Deploying Smart Contracts with Account:", deployer.address);
  console.log("==================================================");

  // Deploy CampaignFactory
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(deployer.address);

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ CampaignFactory Deployed Successfully!");
  console.log("📍 Deployed Address:", factoryAddress);

  // automatically update frontend config with new address 
  const frontendContractsPath = path.join(__dirname, "../frontend/src/config/contracts.js");
  if (fs.existsSync(frontendContractsPath)) {
    let content = fs.readFileSync(frontendContractsPath, "utf-8");
    content = content.replace(
      /export const CAMPAIGN_FACTORY_ADDRESS = '.*'/,
      `export const CAMPAIGN_FACTORY_ADDRESS = '${factoryAddress}'`
    );
    fs.writeFileSync(frontendContractsPath, content);
    console.log("🔄 Frontend contracts.js automatically updated with new address:", factoryAddress);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
