# Rational Commitment

A Solidity implementation of rational number commitments using elliptic curves. The commitment and the verificaiton is implemented.

## Overview

This project implements a system for creating and verifying commitments to rational numbers using elliptic curve cryptography on the BN254 curve. It allows for:
- Creating commitments to rational numbers (a/b)
- Verifying addition of rational number commitments
- Basic elliptic curve operations (addition, scalar multiplication)
- There is full unit testing for the RationalCommitment.sol contract, including calling the precompiled functions 0x05, 0x06, 0x07.

Note that we assume the BN128 curve is used. (Also known as alt_bn128 and BN254).
Eliptic curve equation: y² = x³ + 3

## RationalCommitmenet.sol Contract Functions

### `constructRationalCommitmentsWithPreNormalization`
Creates commitments to two rational numbers. This function pre-normalizes the denominator so when we do the verification we can pass the least amount of information: numerator and denominator.
```solidity
function constructRationalCommitments(
    uint256 a, uint256 da,  // First rational number a/da
    uint256 b, uint256 db   // Second rational number b/db
) public view returns (ECPoint memory A, ECPoint memory B)
```

### `rationalAdd`
Verifies the addition of two rational number commitments. Note that A and B are the commitments to the rational numbers that have been pre-normalized.
```solidity
function rationalAdd(
    ECPoint calldata A,
    ECPoint calldata B,
    uint256 num,
    uint256 den
) public view returns (bool)
```

### `ecAdd`
Adds two points on the BN254 curve using the precompiled contract at address 0x06.
Input points must be on the curve, and the result is verified to be on the curve.
```solidity
function ecAdd(
    ECPoint memory p1,
    ECPoint memory p2
) public view returns (ECPoint memory result)
```

### `ecMul`
Multiplies a point on the BN254 curve by a scalar using the precompiled contract at address 0x07.
Input point must be on the curve, scalar must be non-zero and less than the curve order, and the result is verified to be on the curve.
```solidity
function ecMul(
    ECPoint memory p,
    uint256 s
) public view returns (ECPoint memory result)
```

### `isOnCurve`
Verifies that a point lies on the BN254 curve by checking if it satisfies the curve equation y² = x³ + 3.
```solidity
function isOnCurve(
    ECPoint memory p
) public pure returns (bool)
```

### `fermatInv`
Computes the modular multiplicative inverse using Fermat's Little Theorem via the modular exponentiation precompile at address 0x05.

```solidity
function fermatInv(
    uint256 a,
    uint256 p
) public view returns (uint256)
```

## To start
1. Update the .env file with your private key and alchemy key.
2. Install the dependencies
```bash 
npm init --yes
npm install
npx hardhat test
```

## To deploy to sepolia directly

1. Clean up envrionment and compile
```bash
npx hardhat clean
npx hardhat compile
```

2. Update the .env file with your private key and alchemy key.

For the ErcToken contract as a base line test, you can deploy it with the following command:

```bash
npx hardhat deploy ErcToken --network sepolia
```

For the RationalCommitment contract, you can deploy it with the following command:
```bash
npx hardhat deploy RationalCommitment --network sepolia
```

## Testing

Run the tests using a fork of mainnet in hardhat:
```bash
npx hardhat test
```

## G's used in unit tests

```bash
from py_ecc.bn128 import G1, add, multiply
G1
multiply(G1, 2)
multiply(G1, 3)
```

### Example Output
```
>>> from py_ecc.bn128 import G1, add, multiply
>>> G1
(1, 2)
>>> multiply(G1, 2)
(1368015179489954701390400359078579693043519447331113978918064868415326638035, 9918110051302171585080402603319702774565515993150576347155970296011118125764)
>>> multiply(G1, 3)
(3353031288059533942658390886683067124040920775575537747144343083137631628272, 19321533766552368860946552437480515441416830039777911637913418824951667761761)
```


## Correctness Check Of Calculation of Rational Number Commitment Points

How to calculate two rational numbers commitment points, that are pre-normalized to a common denominator. This is done outside of this project and using python and py_ecc.bn128. This was done to verify the correctness of the pre-normalization function in the solidity code.

```python
from py_ecc.bn128 import G1, add, multiply, curve_order

a, da = 3, 4
b, db = 2, 5

num = a * db + b * da       # 23
den = da * db               # 20
den_inv = pow(den, -1, curve_order)

a_div = (a * db * den_inv) % curve_order
b_div = (b * da * den_inv) % curve_order

A = multiply(G1, a_div)
B = multiply(G1, b_div)

lhs = multiply(add(A, B), den)
rhs = multiply(G1, num)

print(f"\nPoint for A: ((3*5)/(4*5)) * G:")
print(f"x = {A[0]}")
print(f"y = {A[1]}")
print(f"\nPoint for B: ((2*4)/(4*5)) * G:")
print(f"x = {B[0]}")
print(f"y = {B[1]}")
print("\nMatch lhs == rhs:", lhs == rhs)
```

### Example Output
```
Point for A: ((3*5)/(4*5)) * G:
x = 2857625431839718922471812833357737477490018756027287331750692909542658596388
y = 1911129795864509240059974873783816568594673160967429852131769465429209708149

Point for B: ((2*4)/(4*5)) * G:
x = 388140526357927308015211187808346386702734206185696013279200609425519407903
y = 1004033754869722800279829572743116817610584456773029655758286223146239644383

Match lhs == rhs: True
```