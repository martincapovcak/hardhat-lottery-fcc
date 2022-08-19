// Dependencies
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { expect, assert } = require("chai")

// Imports
const { developmentChains, networkConfig } = require("../../helper-hardhat-config.js")
const { owl } = require("../../helpers/helper-log")

// Logic
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
          let lottery
          let deployer, lotteryEntranceFee

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              lottery = await ethers.getContract("Lottery", deployer)
              lotteryEntranceFee = await lottery.getEntranceFee()
          })

          describe("fulfill random words", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  // enter the lottery
                  const startingTimestamp = await lottery.getLatestTimestamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the lottery
                      // Just in case the blockchain moves REALLY fast
                      lottery.once("WinnerPicked", async () => {
                          console.log("Winner picked event fired!")
                          try {
                              // add our assert here
                              const recentWinner = await lottery.getRecentWinner()
                              const lotteryState = await lottery.getLotteryState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimestamp = await lottery.getLatestTimestamp()

                              await expect(lottery.getPlayer(0)).to.be.reverted
                              expect(recentWinner.toString(), accounts[0].address)
                              expect(lotteryState, 0)
                              expect(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(lotteryEntranceFee).toString()
                              )
                              expect(endingTimestamp > startingTimestamp)
                          } catch (e) {
                              console.log(error)
                              reject(e)
                          }
                          resolve()
                      })
                      // await lottery.enterLottery({value: lotteryEntranceFee})
                      await lottery.enterLottery({ value: lotteryEntranceFee })
                      const winnerStartingBalance = await accounts[0].getBalance()

                      // and this code Wont compleete until our listener has finished listening!
                  })
              })
          })
      })
