// Dependencies
const { network } = require("hardhat")

const BASE_FEE = ethers.utils.parseEther("0.25") //premium: cost 0.25 LINK (Oracle gas fee)
const GAS_PRICE_LINK = 1e9 //for mock hardcoded value 1-000-000-000 // (LINK per gas) ..claculated value based on the gas price on the chain

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (chainId == 31337) {
        log("-> Local network detected! Deploying mocs..")
        // deploy a mock vrfcooordinator...
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer,
            log: true,
            args: args,
        })
    }

    log("-> Mocks Deployed!")
}

module.exports.tags = ["all", "mocks"]
