// dependencies
const { network, ethers } = require("hardhat")
require("dotenv").config()

// Imports
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify.js")

module.exports = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // Fund for MOCK
    const VRF_SUB_FUND_AMOUNT = "1000000000000000000000"

    // constructor variables
    let vrfCoordinatorV2Address // contract
    let entranceFee
    let gasLane
    let subscriptionId
    let callbackGasLimit
    let interval

    // programmatical setups for local network testing and online network
    if (developmentChains.includes(network.name)) {
        // we are in local network
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // usually, you'd need the link token on a real network
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        // we are on a online network
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2()
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    // setting variables
    entranceFee = networkConfig[chainId].entranceFee
    gasLane = networkConfig[chainId].gasLane
    callbackGasLimit = networkConfig[chainId].callbackGasLimit
    interval = networkConfig[chainId].interval

    log("-> Network name: ", network.name)
    log("-> Chain ID: ", chainId)
    log("-> Entrance fee: ", entranceFee.toString())

    log("----------------------------------------------------")
    const arguments = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]
    // Deploying contract
    const lottery = await deploy("Lottery", {
        contract: "Lottery",
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("----------------------------------------------------")
    log("-> Lottery Deployed! \n")

    // Verification
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(lottery.address, arguments)
    }
}

module.exports.tags = ["all", "lottery"]
