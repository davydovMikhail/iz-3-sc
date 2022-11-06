import { ethers } from "hardhat";

async function main() {
  const totalSupply = ethers.utils.parseEther("1000000");

  const StakeToken = await ethers.getContractFactory("StakeToken");
  const stakeToken = await StakeToken.deploy(totalSupply);

  await stakeToken.deployed();

  console.log(`StakeToken deployed to ${stakeToken.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
