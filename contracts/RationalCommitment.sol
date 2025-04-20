// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

contract RationalCommitment {
    struct ECPoint {
        uint256 x;
        uint256 y;
    }

    // Precompile addresses
    uint8 constant MODEXP_PRECOMPILE = 0x05;      // ModExp precompile address
    uint8 constant ECADD_PRECOMPILE = 0x06;       // EC addition precompile address
    uint8 constant ECMUL_PRECOMPILE = 0x07;       // EC scalar multiplication precompile address

    // The curve order for BN254/alt_bn128
    uint256 constant CURVE_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    uint256 constant FIELD_MODULUS = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    function ecAdd(ECPoint memory p1, ECPoint memory p2) public view returns (ECPoint memory result) {
        require(isOnCurve(p1) && isOnCurve(p2), "Points must be on curve");
        
        uint256[4] memory input;
        uint256[2] memory output;
        
        input[0] = p1.x;
        input[1] = p1.y;
        input[2] = p2.x;
        input[3] = p2.y;
        
        bool success;
        assembly {
            success := staticcall(gas(), ECADD_PRECOMPILE, input, 0x80, output, 0x40)
        }
        require(success, "EC add failed");
        
        result.x = output[0];
        result.y = output[1];

        require(isOnCurve(result), "Result not on curve");
    }

   function ecMul(ECPoint memory p, uint256 s) public view returns (ECPoint memory result) {
        require(isOnCurve(p), "Point not on curve");
        require(s > 0 && s < CURVE_ORDER, "Invalid scalar");

        uint256[3] memory input = [p.x, p.y, s];
        uint256[2] memory output;

        assembly {
            // Call bn128 scalar multiplication precompile (0x07)
            if iszero(staticcall(gas(), ECMUL_PRECOMPILE, input, 0x60, output, 0x40)) {
                revert(0, 0)
            }
        }

        result.x = output[0];
        result.y = output[1];

        require(isOnCurve(result), "Result not on curve");
    }

   function isOnCurve(ECPoint memory p) public pure returns (bool) {
        if (p.x == 0 && p.y == 0) return false;

        // Debug the first multiplication
        uint256 x_squared = mulmod(p.x, p.x, FIELD_MODULUS);
        // Rest of calculation
        uint256 x_cubed = mulmod(x_squared, p.x, FIELD_MODULUS);
        uint256 lhs = mulmod(p.y, p.y, FIELD_MODULUS);
        uint256 rhs = addmod(x_cubed, 3, FIELD_MODULUS);

        return lhs == rhs;
    }

    function constructRationalCommitmentsWithPreNormalization(
        uint256 a, uint256 da,
        uint256 b, uint256 db
    ) public view returns (ECPoint memory A, ECPoint memory B) {

        //A = (a * db / den) * G. Fully written out this is (((a*db)/(da*db)) * G
        //B = (b * da / den) * G. Fully written out this is (((b*da)/(da*db)) * G
        // Note: we pre-normalize the denominator so when we do the verification 
        // we can pass in num and den only, instead of: den, num, da, db. So den = da * db
        // EC math does not support division so we need the inverse of den so we can multiply instead

        // den = da * db
        uint256 denVal = mulmod(da, db, CURVE_ORDER);

        // inv(den) mod N
        uint256 denInv = fermatInv(denVal, CURVE_ORDER); 

        // a * db * inv(den)mod N
        uint256 aNumerator = mulmod(a, db, CURVE_ORDER);
        uint256 aDiv = mulmod(aNumerator, denInv, CURVE_ORDER);

        // b * da * inv(den) mod N
        uint256 bNumerator = mulmod(b, da, CURVE_ORDER);
        uint256 bDiv = mulmod(bNumerator, denInv, CURVE_ORDER);

        A = ecMul(ECPoint(1, 2), aDiv); // A = (a * db / den) * G
        B = ecMul(ECPoint(1, 2), bDiv); // B = (b * da / den) * G
    }

    function rationalAdd(
        ECPoint calldata A, 
        ECPoint calldata B, 
        uint256 num,        
        uint256 den         
    ) public view returns (bool) {
        ECPoint memory sum = ecAdd(A, B);
        ECPoint memory lhs = ecMul(sum, den);
        ECPoint memory rhs = ecMul(ECPoint(1, 2), num);
        return lhs.x == rhs.x && lhs.y == rhs.y;
    }

    function fermatInv(uint256 a, uint256 p) public view returns (uint256) {
        require(a != 0, "No inverse exists for 0");
        
        // We need to compute a^(p-2) mod p
        uint256 exponent = p - 2;
        
        uint256[6] memory input;
        uint256[1] memory output;
        
        // Input format: [length_of_BASE, length_of_EXPONENT, length_of_MODULUS, BASE, EXPONENT, MODULUS]
        input[0] = 32;     // length of base (a)
        input[1] = 32;     // length of exponent (p-2)
        input[2] = 32;     // length of modulus (p)
        input[3] = a;      // base
        input[4] = exponent;  // exponent
        input[5] = p;      // modulus
        
        // Call modExp precompile
        assembly {
            if iszero(staticcall(gas(), MODEXP_PRECOMPILE, input, 0xC0, output, 0x20)) {
                revert(0, 0)
            }
        }
        
        return output[0];
    }
} 