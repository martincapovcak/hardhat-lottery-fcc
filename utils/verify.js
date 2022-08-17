// dependencies
const { run } = require("hardhat")

// verifying contract programatically
// args - arguments for contract constructor
const verify = async (contractAddress, args) => {
    console.log("\n\n@ Spinning-up verification..")
    console.log("->")
    console.log("-> Verifying contract..")
    console.log("--------------------------------------------------------")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (err) {
        if (err.message.toLowerCase().includes("already verified")) {
            console.log("-> Alredy Verified!")
        } else {
            console.log(err)
        }
    }
    console.log("--------------------------------------------------------")
    console.log("-> Verification finished\n")
}

module.exports = { verify }
