const { expect } = require("chai");
const { ethers } = require("hardhat");
const { G1, G2, G3 } = require("./curvePoints");

// Helper function to convert point to format expected by isOnCurve
const toPoint = (point) => ({
    x: point.x.toString(),
    y: point.y.toString()
});

describe("Rational Commitment", function () {
    let rationalCommitment;

    before(async function () {
        // Verify we're on forked network
        const provider = ethers.provider;
        const network = await provider.getNetwork();
        console.log("Network:", {
            chainId: network.chainId,
            name: network.name,
            ensAddress: network.ensAddress,
            _defaultProvider: network._defaultProvider
        });
        
        const block = await provider.getBlock("latest");
        console.log("Latest block:", block.number);

        // Try to get balance of a known address (Vitalik's address)
        const vitalikAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
        const balance = await provider.getBalance(vitalikAddress);
        console.log("Vitalik's balance:", balance.toString());
    });

    beforeEach(async function () {
        const RationalCommitment = await ethers.getContractFactory("RationalCommitment");
        rationalCommitment = await RationalCommitment.deploy();
    });

    describe("EC Operations", function () {
        describe("Scalar Multiplication", function () {
            const testPoints = [
                {
                    scalar: 2,
                    expected: G2,
                    description: "2G"
                },
                {
                    scalar: 3,
                    expected: G3,
                    description: "3G"
                }
            ];

            testPoints.forEach(({ scalar, expected, description }) => {
                it(`Should compute ${description} correctly`, async function () {
                    const result = await rationalCommitment.ecMul(G1, scalar);
                    const resultPoint = toPoint(result);

                    // Verify result is on curve
                    const isResultOnCurve = await rationalCommitment.isOnCurve(resultPoint);
                    expect(isResultOnCurve).to.be.true;

                    // Verify coordinates match expected values
                    expect(resultPoint.x).to.equal(expected.x);
                    expect(resultPoint.y).to.equal(expected.y);
                });
            });
        });

        describe("Point Addition", function () {
            const additionTests = [
                {
                    name: "G + G = 2G",
                    points: { p1: G1, p2: G1 },
                    expected: G2
                },
                {
                    name: "G + 2G = 3G",
                    points: { p1: G1, p2: G2 },
                    expected: G3
                }
            ];

            additionTests.forEach(({ name, points, expected }) => {
                it(name, async function () {
                    const result = await rationalCommitment.ecAdd(points.p1, points.p2);
                    const resultPoint = toPoint(result);

                    // Verify result is on curve
                    const isResultOnCurve = await rationalCommitment.isOnCurve(resultPoint);
                    expect(isResultOnCurve).to.be.true;

                    // Verify coordinates match expected values
                    expect(resultPoint.x).to.equal(expected.x);
                    expect(resultPoint.y).to.equal(expected.y);
                });
            });
        });
    });

    describe("Point Validation", function () {
        const points = [
            { name: "G", point: G1 },
            { name: "2G", point: G2 },
            { name: "3G", point: G3 }
        ];

        points.forEach(({ name, point }) => {
            it(`Should correctly identify ${name} on the curve`, async function () {
                const isOnCurve = await rationalCommitment.isOnCurve(point);
                expect(isOnCurve).to.be.true;
            });
        });

        it("Should identify point at infinity as not on curve", async function () {
            const pointAtInfinity = { x: 0, y: 0 };
            const isOnCurve = await rationalCommitment.isOnCurve(pointAtInfinity);
            expect(isOnCurve).to.be.false;
        });
    });

    describe("Precompiled Contracts - Sanity Checks against the blockhain we are pointing to", function () {
        it("Should verify precompiled contracts exist", async function () {
            // Super basic test for the bn128 precompile at 0x07
            // Asserts below assume that the bn128 precompile is working correctly and is not compressed
            const result = await ethers.provider.call({
                to: "0x0000000000000000000000000000000000000007",
                data: "0x" + "01".padStart(64, "0") + "02".padStart(64, "0") + "02".padStart(64, "0"),
            });
            
            expect(result).to.equal("0x030644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd315ed738c0e0a7c92e7845f96b2ae9c0a68a6a449e3538fc7ff3ebf7a5a18a2c4")

            // Strip leading 0x03 (1 byte)
            const xHex = "0x" + result.slice(2, 66);
            const yHex = "0x" + result.slice(66, 130);

            const x = BigInt(xHex).toString(10);
            const y = BigInt(yHex).toString(10);

            expect(x).to.equal(G2.x)
            expect(y).to.equal(G2.y)
        });

        it("Should verify identity precompiled contract exist", async function () {
            const result2 = await ethers.provider.call({
                to: "0x0000000000000000000000000000000000000004", // identity precompile
                data: "0x12345678"
            });
            
            expect(result2).to.equal("0x12345678")
        });
    });

    describe("Fermat's Little Theorem", function () {
        const testCases = [
            {
                a: 2,
                p: 17,
                expected: 9    // Because 2 * 9 = 18 ≡ 1 (mod 17)
            },
            {
                a: 3,
                p: 17,
                expected: 6    // Because 3 * 6 = 18 ≡ 1 (mod 17)
            },
            {
                a: 5,
                p: 17,
                expected: 7    // Because 5 * 7 = 35 ≡ 1 (mod 17)
            }
        ];

        testCases.forEach(({ a, p, expected }) => {
            it(`Should compute inverse of ${a} modulo ${p}`, async function () {
                const inverse = await rationalCommitment.fermatInv(a, p);

                const product = (BigInt(a) * BigInt(inverse)) % BigInt(p);
                
                expect(inverse).to.equal(expected);
                
                 // The product should be 1 (mod p) becuase of the definition of modular multiplicate inverse
                expect(product).to.equal(1n); 
            });
        });

        it("Should revert when trying to find inverse of 0", async function () {
            await expect(
                rationalCommitment.fermatInv(0, 17)
            ).to.be.revertedWith("No inverse exists for 0");
        });
    });

    describe("Rational Scaled Commitment Construction", function () {
        const testCases = [
            {
                name: "3/4 and 2/5",
                values: {
                    a: 3n,    // numerator of first rational
                    da: 4n,   // denominator of first rational
                    b: 2n,    // numerator of second rational
                    db: 5n    // denominator of second rational
                },
                // Expected points can be calculated using ecMul with (a/da) and (b/db)
                expected: {
                    // These values were valuculated offline using python and py_ecc.bn128. See ReadMe for exact code
                    A: {
                        x: "2857625431839718922471812833357737477490018756027287331750692909542658596388", 
                        y: "1911129795864509240059974873783816568594673160967429852131769465429209708149"  
                    },
                    B: {
                        x: "388140526357927308015211187808346386702734206185696013279200609425519407903", 
                        y: "1004033754869722800279829572743116817610584456773029655758286223146239644383" 
                    }
                }
            }
        ];

        testCases.forEach(({ name, values, expected }) => {
            it(`Should construct commitments for ${name}`, async function () {
                const { A, B } = await rationalCommitment.constructRationalCommitmentsWithPreNormalization(
                    values.a,
                    values.da,
                    values.b,
                    values.db
                );

                const pointAOnCurve = await rationalCommitment.isOnCurve(toPoint(A));
                const pointBOnCurve = await rationalCommitment.isOnCurve(toPoint(B));

                expect(pointAOnCurve).to.be.true;
                expect(pointBOnCurve).to.be.true;

                expect(A.x.toString()).to.equal(expected.A.x);
                expect(A.y.toString()).to.equal(expected.A.y);
                expect(B.x.toString()).to.equal(expected.B.x);
                expect(B.y.toString()).to.equal(expected.B.y);
            });
        });

        it("Should revert for zero denominators", async function () {
            await expect(
                rationalCommitment.constructRationalCommitmentsWithPreNormalization(1, 0, 1, 1)
            ).to.be.revertedWith("No inverse exists for 0");

            await expect(
                rationalCommitment.constructRationalCommitmentsWithPreNormalization(1, 1, 1, 0)
            ).to.be.revertedWith("No inverse exists for 0");
        });
    });

    describe("Rational Addition Verification", function () {
        const testCases = [
            {
                name: "1/2 + 1/3 = 5/6",
                values: {
                    // First rational: 1/2
                    a: 1n,
                    da: 2n,
                    // Second rational: 1/3
                    b: 1n,
                    db: 3n,
                    // Result: 5/6
                    num: 5n,
                    den: 6n
                },
                expected_verification_result: true
            },
            {
                name: "1/2 + 1/3 ≠ 1/2 (incorrect result)",
                values: {
                    // First rational: 1/2
                    a: 1n,
                    da: 2n,
                    // Second rational: 1/3
                    b: 1n,
                    db: 3n,
                    // Incorrect result: 1/2
                    num: 1n,
                    den: 2n
                },
                expected_verification_result: false
            }
        ];

        testCases.forEach(({ name, values, expected_verification_result }) => {
            it(name, async function () {
                const { A, B } = await rationalCommitment.constructRationalCommitmentsWithPreNormalization(
                    values.a,
                    values.da,
                    values.b,
                    values.db
                );
                const verified = await rationalCommitment.rationalAdd(
                    toPoint(A),
                    toPoint(B),
                    values.num,
                    values.den
                );

                expect(verified).to.equal(expected_verification_result);
            });
        });
    });
}); 