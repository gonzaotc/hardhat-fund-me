// asume we are on a test-net. Last step of the testing journey.

const { assert } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe.staging.test", function() {
          let fundMe
          let deployer
          let sendValue = ethers.utils.parseEther("0.005")
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer // instead of getSigners we use this. Which are defined in our config as the first account. (index 0)
              // await deployments.fixture(["all"]) // assume already deployed.
              fundMe = await ethers.getContract("FundMe", deployer) // gives us the most recent deployed fundMe. This comes from hardhat-deploy
          })

          it("allows people to fund and withdraw", async () => {
              await fundMe.fund({ value: sendValue })
              await fundMe.withdraw({
                  gasLimit: 100000 // we need to set a minimal ammount of gas or it throw: replacement fee too low
              })
              const endingBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              assert.equal(endingBalance.toString(), "0")
          })
      })
