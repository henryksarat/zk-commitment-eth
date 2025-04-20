pragma solidity ^0.8.0;

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
    function matrixMulBasic(
        uint256[] calldata matrix,
        uint256 n,
        uint256[] calldata s,
        IMatrixOperations ops
    ) public pure returns (uint256[] memory result) { 
        if (matrix.length != n * n || s.length != n) {
            revert("Invalid matrix or vector dimensions");
        }
        
        result = new uint256[](n); // Initialize result array
        
        for (uint256 row = 0; row < n; row++) {
            for (uint256 col = 0; col < n; col++) {
                uint256 coeff = matrix[row * n + col];
                uint256 term = ops.multiply(s[col], coeff);
                result[row] = ops.add(result[row], term);
            }
        }

        return result;
    }
}