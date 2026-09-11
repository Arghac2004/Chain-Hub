const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log(" Deploying ChainHub Ecosystem with Account:", deployer.address);
  console.log("==================================================");

  //  Deploy HubToken(ERC-20 Platform Reward Token)
  console.log(" Deploying $HUB ERC-20 Reward Token...");
  const HubToken = await ethers.getContractFactory("HubToken");
  const hubToken = await HubToken.deploy(deployer.address);
  await hubToken.waitForDeployment();
  const hubTokenAddress = await hubToken.getAddress();
  console.log(" HubToken ($HUB) Deployed At:", hubTokenAddress);

  //  Deploy CampaignFactory as UUPS Upgradeable Proxy
  console.log(" Deploying CampaignFactory UUPS Upgradeable Proxy...");
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const factoryProxy = await upgrades.deployProxy(
    CampaignFactory,
    [deployer.address, hubTokenAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await factoryProxy.waitForDeployment();
  const factoryAddress = await factoryProxy.getAddress();
  console.log(" CampaignFactory Proxy Deployed At:", factoryAddress);

  //  Authorize CampaignFactory as Minter on HubToken
  console.log(" Authorizing CampaignFactory to mint $HUB rewards...");
  const authTx = await hubToken.setMinter(factoryAddress, true);
  await authTx.wait();
  console.log(" CampaignFactory is now an Authorized Minter!");

  //  Automatically Synchronize Addresses & ABIs into Frontend
  const frontendContractsPath = path.join(__dirname, "../frontend/src/config/contracts.js");
  if (fs.existsSync(frontendContractsPath)) {
    let content = fs.readFileSync(frontendContractsPath, "utf-8");
    
    // Update or insert CAMPAIGN_FACTORY_ADDRESS
    content = content.replace(
      /export const CAMPAIGN_FACTORY_ADDRESS = '.*'/,
      `export const CAMPAIGN_FACTORY_ADDRESS = '${factoryAddress}'`
    );

    // Update or insert HUB_TOKEN_ADDRESS
    if (content.includes("export const HUB_TOKEN_ADDRESS")) {
      content = content.replace(
        /export const HUB_TOKEN_ADDRESS = '.*'/,
        `export const HUB_TOKEN_ADDRESS = '${hubTokenAddress}'`
      );
    } else {
      content = `// HubToken ($HUB) ERC-20 Address\nexport const HUB_TOKEN_ADDRESS = '${hubTokenAddress}'\n\n` + content;
    }

    fs.writeFileSync(frontendContractsPath, content);
    console.log(" Frontend contracts.js automatically synchronized with live addresses!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
