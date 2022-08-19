require("@nomicfoundation/hardhat-toolbox")
require("@nomicfoundation/hardhat-chai-matchers")
require("@nomiclabs/hardhat-ethers")
require("hardhat-deploy")
require("dotenv").config()

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://alchemy.io"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key"

module.exports = {
    solidity: "0.8.9",
    detaultNetwork: "hardhat",
    networks: {
        localhost: {
            chainId: 31337,
            url: " http://127.0.0.1:8545/",
            blockConfirmations: 1,
        },
        rinkeby: {
            chainId: 4,
            url: RINKEBY_RPC_URL,
            blockConfirmations: 6,
            accounts: [PRIVATE_KEY],
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 500000, // 500 seconds max for running tests
    },
}
