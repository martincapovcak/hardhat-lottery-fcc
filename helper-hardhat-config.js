const { ethers } = require("hardhat")

const networkConfig = {
    default: {
        name: "hardhat",
        interval: "30",
    },
    31337: {
        name: "localhost",
        subscriptionId: "588",
        entranceFee: "100000000000000000", // 100_000_000_000_000_000
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", // 30 gwei
        callbackGasLimit: "500000", //500,000
        interval: "30", // sec
    },
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cffcacd319c818142124b7a15e857ab",
        entranceFee: "100000000000000000", // 100_000_000_000_000_000
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", //30 gwei Key Hash
        subscriptionId: "12074", // vrf.chain.link - subscription ID
        callbackGasLimit: "500000", //500,000
        interval: "30", // sec
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = { networkConfig, developmentChains }
