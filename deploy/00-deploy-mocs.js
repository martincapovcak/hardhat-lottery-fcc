// Dependencies
const { getNamedAccounts, deployments, network } = require("hardhat")

const BASE_FEE = "250000000000000000" //premium: cost 0.25 LINK (Oracle gas fee)
const GAS_PRICE_LINK = 1e9 //for mock hardcoded value 1-000-000-000 // (LINK per gas) ..claculated value based on the gas price on the chain

module.exports = async (hre) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const arguments = [BASE_FEE, GAS_PRICE_LINK]

    if (chainId == 31337) {
        log("\n-> Local network detected! Deploying mocs..")
        log("----------------------------------------------------")
        // deploy a mock vrfcooordinator...
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer,
            log: true,
            args: arguments,
        })
        log("----------------------------------------------------")
    }
    log("-> Mocks Deployed! \n")
}

module.exports.tags = ["all", "mocks"]
