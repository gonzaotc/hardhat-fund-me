const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async () => {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1") // 1 eth

          beforeEach(async () => {
              // deploy using Hardhat-deploy
              // const accounts = await ethers.getSigners() // returns what is in the networks accounts config
              deployer = (await getNamedAccounts()).deployer // instead of getSigners we use this. Which are defined in our config as the first account. (index 0)
              await deployments.fixture(["all"])
              fundMe = await ethers.getContract("FundMe", deployer) // gives us the most recent deployed fundMe. This comes from hardhat-deploy
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", async () => {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })
          describe("fund", async () => {
              it("Fails if you don't send enough", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              it("updates the amount funded", async () => {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funder to array of funders", async () => {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })
          describe("withdraw ", async () => {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })
              it("withdraw ETH from a single founder", async () => {
                  // Arrange
                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )
                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  // get the gas cost.
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const totalGasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  // Assert
                  assert.equal(endingFundMeBalance.toString(), "0")
                  assert.equal(
                      startingDeployerBalance
                          .add(startingFundMeBalance)
                          .toString(), // we use add instead of + because is a bigNumber
                      endingDeployerBalance.add(totalGasCost).toString()
                  )
              })
              it("withdraw ETH from multiple funders", async () => {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  console.log("accounts length", accounts.length)
                  for (let i = 1; i < 6; i++) {
                      // await fundMe.fund({
                      //     value: sendValue,
                      //     from: accounts[i].address
                      // })
                      // this is not a valid way BECAUSE we have an instance of foundMe already connected to an address.
                      // we previously connected it with the deployer address, so, now we have to overwrite using conect.

                      // patrick does
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  // get the gas cost.
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const totalGasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  // Assert
                  assert.equal(endingFundMeBalance.toString(), "0")
                  assert.equal(
                      startingDeployerBalance
                          .add(startingFundMeBalance)
                          .sub(totalGasCost)
                          .toString(),
                      endingDeployerBalance.toString()
                  )

                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (let i = 0; i < 6; i++) {
                      assert.equal(
                          (
                              await fundMe.getAddressToAmountFunded(
                                  accounts[i].address
                              )
                          ).toString(),
                          "0"
                      )
                  }
              })
              it("only allows the owner to withdraw", async () => {
                  const accounts = ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  )
                  await expect(attackerConnectedContract.withdraw()).to.be
                      .reverted
              })
          })
      })
