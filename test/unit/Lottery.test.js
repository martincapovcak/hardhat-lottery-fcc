// Dependencies
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { expect, assert } = require("chai")

// Imports
const { developmentChains, networkConfig } = require("../../helper-hardhat-config.js")
const { owl } = require("../../helpers/helper-log")

// Logic
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
          let lottery, vrfCoordinatorV2Mock
          let deployer, lotteryEntranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              lottery = await ethers.getContract("Lottery", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)

              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = await lottery.getInterval()
          })

          describe("constructor", () => {
              it("lotteryState init", async () => {
                  // Ideally we make our tests have just 1 assert per "it"
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState.toString(), "0")
              })
              it("interval init", async () => {
                  const interval = await lottery.getInterval()
                  expect(interval.toString(), networkConfig[chainId].interval)
              })
          })

          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__InsufficientEntranceFund"
                  )
              })
              it("records players when they enter", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  const playerFromContract = await lottery.getPlayer(0)
                  expect(playerFromContract, deployer)
              })
              it("emits an event", async () => {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "LotteryEnter"
                  )
              })

              it("doesnt allow entrance when lottery is calculating", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  // Modify local blockchain time
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // We pretend to be a Chainlink Keeper
                  await lottery.performUpkeep([])
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee })
                  ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen")
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })

              it("returns false if lottery isn't open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await lottery.performUpkeep("0x")
                  const lotteryState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert.equal(lotteryState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })

              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", () => {
              it("it can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await lottery.performUpkeep([])
                  assert(tx)
              })

              it("reverts when checkupkeep is false", async () => {
                  await expect(lottery.performUpkeep([])).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__UpkeepNotNeeded"
                  )
              })

              it("updates the lottery state, emits an event, and calls the vrf coordinator", async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await lottery.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  // owl - custom log
                  owl("receipt:", txReceipt.events[1].args)
                  const requestId = txReceipt.events[1].args._requestId
                  const lotteryState = await lottery.getLotteryState()
                  assert(requestId.toNumber() > 0)
                  assert(lotteryState.toString() == "1")
              })
          })
          describe("fulfill random words", () => {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets the lottery, and sends money", async () => {
                  const accounts = await ethers.getSigners()

                  const additionalEntrances = 3
                  const startingAccountIndex = 1 // deployer = 0
                  for (let i = startingAccountIndex; i <= additionalEntrances; i++) {
                      const accountConnectedLottery = lottery.connect(accounts[1])
                      await accountConnectedLottery.enterLottery({ value: lotteryEntranceFee })
                  }
                  const startingTimestamp = await lottery.getLatestTimestamp()

                  // performUpkeep (mock being chailnlink keepers)
                  // fullfill random words (mock being the Chainlink VRF)
                  // we will have to wait for the fulfillRandomWords to be called

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("Found the event!")
                          try {
                              const recentWinner = await lottery.getRecentWinner()
                              const lotteryState = await lottery.getLotteryState()
                              const endingTimestamp = await lottery.getLatestTimestamp()
                              const numPlayers = await lottery.getNumberOfPlayers()
                              const winnerEndingBalance = await accounts[1].getBalance()
                              expect(numPlayers.toString(), "0")
                              expect(lotteryState.toString(), "0")
                              expect(endingTimestamp > startingTimestamp)
                              // console.log("Winner -> ", recentWinner)
                              // console.log(accounts[0].address)
                              // console.log(accounts[1].address)
                              // console.log(accounts[2].address)
                              // console.log(accounts[3].address)

                              expect(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      lotteryEntranceFee
                                          .mul(additionalEntrances)
                                          .add(lotteryEntranceFee)
                                          .toString()
                                  )
                              )
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })
                      // Setting up the listener
                      // below, we will fire the event, and the listener will pick it up, and resolve
                      const tx = await lottery.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args._requestId,
                          lottery.address
                      )
                  })
              })
          })
      })
