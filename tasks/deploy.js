const { task } = require("hardhat/config");

task("deploy", "Deploys a contract")
  .addPositionalParam("contract", "The contract to deploy")
  .addOptionalVariadicPositionalParam("constructorArgs", "Constructor arguments", [])
  .setAction(async (taskArgs, hre) => {
    try {
      // Get the contract factory and signer
      const [deployer] = await hre.ethers.getSigners();
      const Contract = await hre.ethers.getContractFactory(taskArgs.contract);
      
      // For ErcToken, automatically use deployer's address as initialOwner if no args provided
      let args = taskArgs.constructorArgs;
      if (taskArgs.contract === "ErcToken" && args.length === 0) {
        args = [await deployer.getAddress()];
      }
      
      // Deploy the contract with constructor arguments
      console.log(`Deploying ${taskArgs.contract}...`);
      console.log('Constructor args:', args);
      
      const contract = await Contract.deploy(...args);
      await contract.waitForDeployment();
      
      // Get the deployed address
      const address = await contract.getAddress();
      console.log(`${taskArgs.contract} deployed to: ${address}`);
      
      return address;
    } catch (error) {
      console.error("Error during deployment:", error);
      process.exit(1);
    }
}); 