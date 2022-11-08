import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from '@ethersproject/units';

describe("Stake token test", async function () {

  async function deployStakeTokenAndPrepare() {

    const totalSupply = parseEther('1000000');
    const defaultUserBalance = parseEther('10000')
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const StakeToken = await ethers.getContractFactory("StakeToken");
    const stakeToken = await StakeToken.connect(owner).deploy(totalSupply);

    await stakeToken.connect(owner).transfer(user1.address, defaultUserBalance);
    await stakeToken.connect(owner).transfer(user2.address, defaultUserBalance);
    await stakeToken.connect(owner).transfer(user3.address, defaultUserBalance);

    return { stakeToken, owner, user1, user2, user3, totalSupply, defaultUserBalance };
  }

  async function timeMovement(_seconds: number) {
    await ethers.provider.send("evm_increaseTime", [_seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  describe("Deployment", function () {
    it("Should set the correct totalSupply", async function () {
      const { stakeToken, totalSupply } = await loadFixture(deployStakeTokenAndPrepare);
      expect(await stakeToken.totalSupply()).to.equal(totalSupply);
    });

    it("Should set the right balances by users", async function () {
      const { stakeToken, owner, user1, user2, user3, totalSupply, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      expect(await stakeToken.balanceOf(owner.address)).to.equal(totalSupply.sub(defaultUserBalance.mul(3)));
      expect(await stakeToken.balanceOf(user1.address)).to.equal(defaultUserBalance);
      expect(await stakeToken.balanceOf(user2.address)).to.equal(defaultUserBalance);
      expect(await stakeToken.balanceOf(user3.address)).to.equal(defaultUserBalance);
    });
  });

  describe("Staking workflow", function () {
    it("User 1 stakes his coins and balances is changed", async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      await stakeToken.connect(user1).stake(defaultUserBalance);
      expect(await stakeToken.balanceOf(stakeToken.address)).to.equal(defaultUserBalance);
      expect(await stakeToken.balanceOf(user1.address)).to.equal(0);
    });

    it("User 1 stakes his coins and then he claimed rewards in an hour and a half", async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      const hourAndHalf = 60 * 60 * 1.5;
      const estimatedRewards = parseEther(((10_000 / 10) * 1.5).toString());
      await stakeToken.connect(user1).stake(defaultUserBalance);
      await timeMovement(hourAndHalf);
      await stakeToken.connect(user1).claim();
      expect(await stakeToken.balanceOf(user1.address)).to.be.closeTo(estimatedRewards, parseEther('1'));
    });

    it("Check changing totalSupply after claim", async function () {
      const { stakeToken, user1, totalSupply, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      const hoursQuantity = 60 * 60 * 10.3; // 10.3 hours
      const estimatedRewards = parseEther(((10_000 / 10) * 10.3).toString());
      await stakeToken.connect(user1).stake(defaultUserBalance);
      await timeMovement(hoursQuantity);
      await stakeToken.connect(user1).claim();
      expect(await stakeToken.totalSupply()).to.be.closeTo(totalSupply.add(estimatedRewards), parseEther('1'));
    });

    it("Check correct work unstake",async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      const aDay = 60 * 60 * 24;
      await stakeToken.connect(user1).stake(defaultUserBalance);
      expect(await stakeToken.balanceOf(user1.address)).to.equal(0);
      await timeMovement(aDay);
      await stakeToken.connect(user1).unstake();
      expect(await stakeToken.balanceOf(user1.address)).to.equal(defaultUserBalance);
    });

    it("Repeated stake and unstake", async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      await stakeToken.connect(user1).stake(defaultUserBalance.div(2));
      await stakeToken.connect(user1).stake(defaultUserBalance.div(2));
      const aDay = 60 * 60 * 24;
      await timeMovement(aDay);
      await stakeToken.connect(user1).unstake();
      expect(await stakeToken.balanceOf(user1.address)).to.equal(defaultUserBalance);
    });
    
  });

  describe("Check staking requires", function () {

    it("Zero stake", async function () {
      const { stakeToken, user1 } = await loadFixture(deployStakeTokenAndPrepare);
      await expect(stakeToken.connect(user1).stake(0)).to.be.revertedWith("Amount must be greater then zero.");
    });

    it("Claim without stake", async function () {
      const { stakeToken, user1 } = await loadFixture(deployStakeTokenAndPrepare);
      await expect(stakeToken.connect(user1).claim()).to.be.revertedWith("Your tokens is not staked yet.");
    });

    it("Checking claim by time", async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      await stakeToken.connect(user1).stake(defaultUserBalance);
      await expect(stakeToken.connect(user1).claim()).to.be.revertedWith("It's been less than an hour.");
    });

    it("Repeated unstake", async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      await stakeToken.connect(user1).stake(defaultUserBalance);
      const aDay = 60 * 60 * 24;
      await timeMovement(aDay);
      await stakeToken.connect(user1).unstake();
      await expect(stakeToken.connect(user1).unstake()).to.be.revertedWith("Your tokens is not staked yet.");
    });

    it("Checking unstake by time", async function () {
      const { stakeToken, user1, defaultUserBalance } = await loadFixture(deployStakeTokenAndPrepare);
      await stakeToken.connect(user1).stake(defaultUserBalance);
      const halfDay = 60 * 60 * 12;
      await timeMovement(halfDay);
      await expect(stakeToken.connect(user1).unstake()).to.be.revertedWith("The time for unstake has not yet come.");
    });
  });
 
});
