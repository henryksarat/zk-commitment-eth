const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ErcToken", function () {
  let ercToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const ErcToken = await ethers.getContractFactory("ErcToken");
    ercToken = await ErcToken.deploy(owner.address);
    await ercToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ercToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await ercToken.balanceOf(owner.address);
      expect(await ercToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await ercToken.transfer(addr1.address, 50);
      expect(await ercToken.balanceOf(addr1.address)).to.equal(50);

      await ercToken.connect(addr1).transfer(addr2.address, 50);
      expect(await ercToken.balanceOf(addr2.address)).to.equal(50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await ercToken.balanceOf(owner.address);
      await expect(
        ercToken.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(ercToken, "ERC20InsufficientBalance");
      expect(await ercToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      await ercToken.mint(addr1.address, 100);
      expect(await ercToken.balanceOf(addr1.address)).to.equal(100);
    });

    it("Should fail if non-owner tries to mint", async function () {
      await expect(
        ercToken.connect(addr1).mint(addr2.address, 100)
      ).to.be.revertedWithCustomError(ercToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    it("Should allow users to burn their tokens", async function () {
      await ercToken.transfer(addr1.address, 100);
      await ercToken.connect(addr1).burn(50);
      expect(await ercToken.balanceOf(addr1.address)).to.equal(50);
    });
  });

  describe("Token Metadata", function () {
    it("Should have correct name and symbol", async function () {
      expect(await ercToken.name()).to.equal("Henryk Sarat");
      expect(await ercToken.symbol()).to.equal("Henryk");
    });

    it("Should have 18 decimals", async function () {
      expect(await ercToken.decimals()).to.equal(18);
    });

    it("Should assign initial supply to deployer", async function () {
      const expectedSupply = ethers.parseUnits("1000000", 18);  // 1 million tokens with 18 decimals
      expect(await ercToken.totalSupply()).to.equal(expectedSupply);
      expect(await ercToken.balanceOf(owner.address)).to.equal(expectedSupply);
    });
  });
}); 