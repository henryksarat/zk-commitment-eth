const { expect } = require("chai");
const { G1, G2, G3, G4 } = require("./curvePoints");

describe("MatrixECCheck", function() {
  let checker;
  let operations;
  let rc;  // Add RC variable

  beforeEach(async function() {
    // Deploy the DefaultOperations contract
    const DefaultOperations = await ethers.getContractFactory("DefaultOperations");
    const operationsDeployed = await DefaultOperations.deploy();
    operations = await ethers.getContractAt("DefaultOperations", await operationsDeployed.getAddress());

    // Deploy the MatrixECCheck contract
    const MatrixECCheck = await ethers.getContractFactory("MatrixECCheck");
    const checkerDeployed = await MatrixECCheck.deploy();
    checker = await ethers.getContractAt("MatrixECCheck", await checkerDeployed.getAddress());

    // Deploy the RationalCommitment contract
    const RationalCommitment = await ethers.getContractFactory("RationalCommitment");
    const rcDeployed = await RationalCommitment.deploy();
    rc = await ethers.getContractAt("RationalCommitment", await rcDeployed.getAddress());
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

  it("should multiply EC matrix correctly", async function() {
    const n = 2;
    const matrix = [
      1,2,
      3,4
    ];
    const vector = [G1, G2];  // 2x1 vector

    const result = await checker.matrixMulEC(matrix, n, vector, rc.getAddress());

    // Expected results:
    // result[0] = G1 * 2 + G2 = G5
    // result[1] = G3 + 4 * G2 = G11
    const expected0 = await rc.ecMul(G1, 5);
    const expected1 = await rc.ecMul(G1, 11);

    expect(result[0].x).to.equal(expected0.x);
    expect(result[0].y).to.equal(expected0.y);
    expect(result[1].x).to.equal(expected1.x);
    expect(result[1].y).to.equal(expected1.y);
  });

  it("should multiply 3*3 EC matrix correctly", async function() {
    const n = 3;
    const matrix = [
      1,2,9,
      3,4,10,
      5,6,11
    ];
    const vector = [G1, G2, G3];  

    const result = await checker.matrixMulEC(matrix, n, vector, rc.getAddress());

    // Expected results:
    // result[0] = 1* G1 + 2* G2 + 9* G3 = G1 + G4 + G27 = G25
    // result[1] = 3* G1 + 4* G2 + 10* G3 = G3 + G8 + G30 = G41
    // result[2] = 5 * G1 + 6 * G2 + 11 * G3 = G5 + G12 + G33 = G50
    const expected0 = await rc.ecMul(G1, 32);
    const expected1 = await rc.ecMul(G1, 41);
    const expected2 = await rc.ecMul(G1, 50);

    expect(result[0].x).to.equal(expected0.x);
    expect(result[0].y).to.equal(expected0.y);
    expect(result[1].x).to.equal(expected1.x);
    expect(result[1].y).to.equal(expected1.y);
    expect(result[2].x).to.equal(expected2.x);
    expect(result[2].y).to.equal(expected2.y);
  });

  it("should revert EC matrix multiplication with invalid dimensions", async function() {
    const n = 2;
    const matrix = [
      2, 3, 
      4,  // Only providing 3 points for a 2x2 matrix
    ];
    const vector = [G1, G2];

    await expect(checker.matrixMulEC(matrix, n, vector, rc.getAddress()))
      .to.be.revertedWith("Invalid matrix or vector dimensions");
  });
}); 