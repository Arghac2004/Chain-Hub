const { ethers } = require("hardhat");

async function main() {
  console.log(" Deploying SepoliaP2PEscrow to Sepolia Testnet...");

  const [deployer] = await ethers.getSigners();
  console.log(" Deployer Address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(" Deployer Balance:", ethers.formatEther(balance), "ETH");

  const SepoliaP2PEscrow = await ethers.getContractFactory("SepoliaP2PEscrow");
  const p2pContract = await SepoliaP2PEscrow.deploy();
  await p2pContract.waitForDeployment();

  const contractAddress = await p2pContract.getAddress();
  console.log("\n==================================================");
  console.log(" SepoliaP2PEscrow DEPLOYED SUCCESSFULLY!");
  console.log(" Contract Address:", contractAddress);
  console.log(" Etherscan Link:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("==================================================\n");

  console.log("Next steps:");
  console.log("1. Copy the contract address into frontend/src/config/p2pContract.js");
  console.log("2. Open frontend and trade ETH / Tokens on Sepolia!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
