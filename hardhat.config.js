require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/deploy");

const FORK_ENABLED = process.env.FORK === "true";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      ...(FORK_ENABLED && {
        forking: {
          url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
          blockNumber: 19000000 // Optional: you can specify a block number to fork from
        }
      })
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};