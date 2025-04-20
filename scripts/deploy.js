task("deploy", "Deploys a contract")
  .addPositionalParam("contract", "The contract to deploy")
  .setAction(async (taskArgs) => {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const contractName = taskArgs.contract || "ErcToken";  // Default to ErcToken if not specified
    console.log("Deploying contract:", contractName);

    const Contract = await ethers.getContractFactory(contractName);
    
    // Deploy with constructor arguments if it's ErcToken, otherwise deploy without args
    const contract = contractName === "ErcToken" 
      ? await Contract.deploy(deployer.address)
      : await Contract.deploy();

    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`${contractName} deployed to:`, address);

    if (contractName === "ErcToken") {
      const name = await contract.name();
      const symbol = await contract.symbol();
      console.log("Token name:", name);
      console.log("Token symbol:", symbol);
    }
  });

module.exports = {}; 