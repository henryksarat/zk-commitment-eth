const { expect } = require("chai");
const { G1, G2, G3, G4, G5, G7 } = require("./curvePoints");
const { ethers } = require("hardhat");

describe("MatrixECCheck", function() {
  let checker;
  let operations;
  let rc;  // Add RC variable
  let matrixECCheck;
  let rationalCommitment;

  beforeEach(async function() {
    // Deploy the DefaultOperations contract
    const DefaultOperations = await ethers.getContractFactory("DefaultOperations");
    const operationsDeployed = await DefaultOperations.deploy();
    operations = await ethers.getContractAt("DefaultOperations", await operationsDeployed.getAddress());

    // Deploy the MatrixECCheck contract
    const MatrixECCheck = await ethers.getContractFactory("MatrixECCheck");
    const checkerDeployed = await MatrixECCheck.deploy();
    matrixECCheck = await ethers.getContractAt("MatrixECCheck", await checkerDeployed.getAddress());

    // Deploy the RationalCommitment contract
    const RationalCommitment = await ethers.getContractFactory("RationalCommitment");
    const rcDeployed = await RationalCommitment.deploy();
    rc = await ethers.getContractAt("RationalCommitment", await rcDeployed.getAddress());
  });

  describe("matrixMulBasic", function() {
    const TEST_CASES = {
      '2x2': {
        n: 2,
        matrix: [1, 2, 3, 4],
        vector: [5, 6],
        expected: [17, 39], // [1*5 + 2*6, 3*5 + 4*6]
      },
      '3x3': {
        n: 3,
        matrix: [
          1, 2, 3,    // First row
          4, 5, 6,    // Second row
          7, 8, 9     // Third row
        ],
        vector: [2, 1, 3],
        expected: [13, 31, 49], // [1*2 + 2*1 + 3*3, 4*2 + 5*1 + 6*3, 7*2 + 8*1 + 9*3]
      }
    };

    Object.entries(TEST_CASES).forEach(([size, testCase]) => {
      it(`should multiply ${size} matrix correctly`, async function() {
        const { matrix, n, vector, expected } = testCase;
        const result = await matrixECCheck.matrixMulBasic(matrix, n, vector, await operations.getAddress());
        
        expected.forEach((exp, i) => {
          expect(result[i]).to.equal(exp);
        });
      });
    });

    it("should revert with invalid dimensions", async function() {
      const n = 2;
      const matrix = [1, 2, 3];     // Wrong size
      const vector = [5, 6];
      
      await expect(matrixECCheck.matrixMulBasic(matrix, n, vector, await operations.getAddress()))
        .to.be.revertedWith("Invalid matrix or vector dimensions");
    });
  });

  describe("EC Matrix multiplication", function() {
    it("should multiply 2x2 EC matrix correctly", async function() {
      const n = 2;
      const matrix = [
        1, 2,
        3, 4
      ];
      const vector = [G1, G2];

      const result = await matrixECCheck.matrixMulEC(matrix, n, vector, rc.getAddress());

      // result[0] = 1*G1 + 2*G2 = G5
      // result[1] = 3*G1 + 4*G2 = G11
      const expected0 = await rc.ecMul(G1, 5);
      const expected1 = await rc.ecMul(G1, 11);

      expect(result[0].x).to.equal(expected0.x);
      expect(result[0].y).to.equal(expected0.y);
      expect(result[1].x).to.equal(expected1.x);
      expect(result[1].y).to.equal(expected1.y);
    });

    it("should multiply 3x3 EC matrix correctly", async function() {
      const n = 3;
      const matrix = [
        1, 2, 9,
        3, 4, 10,
        5, 6, 11
      ];
      const vector = [G1, G2, G3];  

      const result = await matrixECCheck.matrixMulEC(matrix, n, vector, rc.getAddress());

      // result[0] = 1*G1 + 2*G2 + 9*G3 = G32
      // result[1] = 3*G1 + 4*G2 + 10*G3 = G41
      // result[2] = 5*G1 + 6*G2 + 11*G3 = G50
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

    it("should revert with invalid dimensions", async function() {
      const n = 2;
      const matrix = [2, 3, 4];  // Only providing 3 points for a 2x2 matrix
      const vector = [G1, G2];

      await expect(matrixECCheck.matrixMulEC(matrix, n, vector, rc.getAddress()))
        .to.be.revertedWith("Invalid matrix or vector dimensions");
    });
  });

  describe("Matrix multiplication claim verification", function() {
    // Test data for 2x2 matrix multiplication
    const MATRIX_2X2_TEST_DATA = {
      matrix: [
        2, 3,  // First row
        1, 4   // Second row
      ],
      n: 2,
      s: [G5, G7],
      
      // Matrix multiplication visualization:
      // [2 3] [5] = [2*5 + 3*7] = [31]
      // [1 4] [7]   [1*5 + 4*7]   [33]
      expectedOutput: [
        2n * 5n + 3n * 7n, // 31
        1n * 5n + 4n * 7n  // 33
      ]
    };

    it("should verify a valid 2x2 matrix multiplication claim", async function () {
      const { matrix, n, s, expectedOutput } = MATRIX_2X2_TEST_DATA;
  
      const result = await matrixECCheck.verifyMatrixMultClaim(
        matrix,
        n,
        s,
        G1,
        expectedOutput,
        rc.getAddress()
      );
      expect(result).to.be.true;
    });

    it("should reject an invalid matrix multiplication claim", async function () {
      const { matrix, n, s } = MATRIX_2X2_TEST_DATA;
      const wrongOutput = [
        32n, // Wrong value (should be 31)
        33n
      ];
      
      const result = await matrixECCheck.verifyMatrixMultClaim(
        matrix,
        n,
        s,
        G1,
        wrongOutput,
        rc.getAddress()
      );
      expect(result).to.be.false;
    });

    it("should revert with invalid dimensions", async function () {
      const invalidMatrix = [1, 2, 3]; // 3 elements (invalid for 2x2)
      const { n, s, expectedOutput } = MATRIX_2X2_TEST_DATA;

      await expect(
        matrixECCheck.verifyMatrixMultClaim(
          invalidMatrix,
          n,
          s,
          G1,
          expectedOutput,
          rc.getAddress()
        )
      ).to.be.revertedWith("Invalid input dimensions");
    });
  });
}); 