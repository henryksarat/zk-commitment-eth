const { expect } = require("chai");

describe("DefaultOperations", function() {
  let operations;

  beforeEach(async function() {
    const DefaultOperations = await ethers.getContractFactory("DefaultOperations");
    const operationsDeployed = await DefaultOperations.deploy();
    operations = await ethers.getContractAt("DefaultOperations", await operationsDeployed.getAddress());
  });

  describe("multiply", function() {
    it("should multiply two positive numbers correctly", async function() {
      expect(await operations.multiply(5, 3)).to.equal(15);
    });

    it("should handle zero multiplication", async function() {
      expect(await operations.multiply(0, 5)).to.equal(0);
      expect(await operations.multiply(5, 0)).to.equal(0);
    });

    it("should handle large numbers", async function() {
      const largeNum1 = ethers.parseUnits("1", "ether"); // 1e18
      const result = await operations.multiply(largeNum1, 2);
      expect(result).to.equal(largeNum1 * BigInt(2));
    });
  });

  describe("add", function() {
    it("should add two positive numbers correctly", async function() {
      expect(await operations.add(5, 3)).to.equal(8);
    });

    it("should handle zero addition", async function() {
      expect(await operations.add(0, 5)).to.equal(5);
      expect(await operations.add(5, 0)).to.equal(5);
    });

    it("should handle large numbers", async function() {
      const largeNum1 = ethers.parseUnits("1", "ether"); // 1e18
      const largeNum2 = ethers.parseUnits("2", "ether"); // 2e18
      const result = await operations.add(largeNum1, largeNum2);
      expect(result).to.equal(largeNum1 + largeNum2);
    });
  });

  describe("interface compliance", function() {
    it("should implement IMatrixOperations interface", async function() {
      // Check if the contract implements the interface by calling both required functions
      await expect(operations.multiply(1, 1)).to.not.be.reverted;
      await expect(operations.add(1, 1)).to.not.be.reverted;
    });
  });
}); 