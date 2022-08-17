// Dependencies
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { expect, assert } = require("chai")

// Imports
const { developmentChains, networkConfig } = require("../../helper-hardhat-config.js")

// Logic
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", async () => {
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

          describe("constructor", async () => {
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

          describe("enterLottery", async () => {
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
          describe("checkUpkeep", async () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
          })
      })
