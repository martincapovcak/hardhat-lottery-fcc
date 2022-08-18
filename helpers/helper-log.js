// owl - custom log
const owl = (_description, _payload) => {
    console.log("\n")
    console.log(`-> ${_description}`)
    console.log("---------------------------")
    console.log(callback(_payload))
    console.log("---------------------------")
    console.log("\n")
}

function callback(payload) {
    return payload
}

module.exports = { owl }
