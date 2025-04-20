const { expect } = require("chai");

describe.only("MatrixECCheck", function() {
  let checker;
  let operations;

  beforeEach(async function() {
    // Deploy the DefaultOperations contract
    const DefaultOperations = await ethers.getContractFactory("DefaultOperations");
    const operationsDeployed = await DefaultOperations.deploy();
    operations = await ethers.getContractAt("DefaultOperations", await operationsDeployed.getAddress());

    // Deploy the MatrixECCheck contract
    const MatrixECCheck = await ethers.getContractFactory("MatrixECCheck");
    const checkerDeployed = await MatrixECCheck.deploy();
    checker = await ethers.getContractAt("MatrixECCheck", await checkerDeployed.getAddress());
  });

  it("should multiply matrix correctly", async function() {
    const n = 2;
    const matrix = [1, 2, 3, 4];  // 2x2 matrix
    const vector = [5, 6];        // 2x1 vector
    
    const result = await checker.matrixMulBasic(matrix, n, vector, await operations.getAddress());
    
    expect(result[0]).to.equal(17); // 1*5 + 2*6
    expect(result[1]).to.equal(39); // 3*5 + 4*6
  });

  it("should multiply 3x3 matrix correctly", async function() {
    const n = 3;
    const matrix = [
      1, 2, 3,    // First row
      4, 5, 6,    // Second row
      7, 8, 9     // Third row
    ];
    const vector = [2, 1, 3];  // 3x1 vector
    
    const result = await checker.matrixMulBasic(matrix, n, vector, await operations.getAddress());
    
    // First row: 1*2 + 2*1 + 3*3 = 13
    // Second row: 4*2 + 5*1 + 6*3 = 27
    // Third row: 7*2 + 8*1 + 9*3 = 41
    expect(result[0]).to.equal(13);
    expect(result[1]).to.equal(31);
    expect(result[2]).to.equal(49);
  });

  it("should revert with invalid dimensions", async function() {
    const n = 2;
    const matrix = [1, 2, 3];     // Wrong size
    const vector = [5, 6];
    
    await expect(checker.matrixMulBasic(matrix, n, vector, await operations.getAddress()))
      .to.be.revertedWith("Invalid matrix or vector dimensions");
  });
}); 