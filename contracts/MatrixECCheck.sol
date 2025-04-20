// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RationalCommitment.sol";
import "hardhat/console.sol";

// Basic arithmetic operations
interface IMatrixOperations {
    function multiply(uint256 a, uint256 b) external pure returns (uint256);
    function add(uint256 a, uint256 b) external pure returns (uint256);
}

contract DefaultOperations is IMatrixOperations {
    function multiply(uint256 a, uint256 b) external pure returns (uint256) {
        return a * b;
    }
    
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }
}

contract MatrixECCheck {
    // Regular matrix multiplication with basic arithmetic
    function matrixMulBasic(
        uint256[] calldata matrix,
        uint256 n,
        uint256[] calldata s,
        IMatrixOperations ops
    ) public pure returns (uint256[] memory result) { 
        if (matrix.length != n * n || s.length != n) {
            revert("Invalid matrix or vector dimensions");
        }
        
        result = new uint256[](n);
        
        for (uint256 row = 0; row < n; row++) {
            for (uint256 col = 0; col < n; col++) {
                uint256 coeff = matrix[row * n + col];
                uint256 term = ops.multiply(s[col], coeff);
                result[row] = ops.add(result[row], term);
            }
        }

        return result;
    }

    // Matrix multiplication with EC points
    function matrixMulEC(
        uint256[] calldata matrix,
        uint256 n,
        RationalCommitment.ECPoint[] calldata s,
        RationalCommitment rc
    ) public view returns (RationalCommitment.ECPoint[] memory result) { 
        if (matrix.length != n * n || s.length != n) {
            revert("Invalid matrix or vector dimensions");
        }
        
        result = new RationalCommitment.ECPoint[](n);
        
        // Initialize with point at infinity
        for (uint256 i = 0; i < n; i++) {
            result[i] = RationalCommitment.ECPoint(0, 0);
        }
        
        for (uint256 row = 0; row < n; row++) {
            for (uint256 col = 0; col < n; col++) {
                uint256 coeff = matrix[row * n + col];

                RationalCommitment.ECPoint memory term = rc.ecMul(s[col], coeff);

                if (result[row].x == 0 && result[row].y == 0) {
                    result[row] = term;
                } else {
                    result[row] = rc.ecAdd(result[row], term);
                }
            }
        }

        return result;
    }
}