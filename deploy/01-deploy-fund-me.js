    const { networkConfig, developmentChains } = require("../helper-hardhat-config")
    const { network } = require("hardhat")
    const { verify } = require("../utils/verify")

    module.exports = async ({ getNamedAccounts, deployments }) => {
        const { deploy, log } = deployments
        const { deployer } = await getNamedAccounts() // gets from hadhat.config.js
        const chainId = network.config.chainId // chain in which the contract is deployed

        // make this script to deploy with the correct price feed  address
        // if chainId is X use address Y for price feeds. Getting this from networkConfig file.

        // when going for localhost or hardhat network we want to use a mock
        // So, if the contract doesn't exist, we deploy a minimal version for local testing

        let ethUsdPriceFeedAddress

        // if we are in a development chain -> use mock price feed
        if (developmentChains.includes(network.name)) {
            const ethUsdAggregator = await deployments.get("MockV3Aggregator")
            ethUsdPriceFeedAddress = ethUsdAggregator.address
        } else {
            // if we are not in a development chain
            ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
        }

        const args = [ethUsdPriceFeedAddress]

        const fundMe = await deploy("FundMe", {
            from: deployer,
            args: args, // put price feeds address,
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1
        })

        if (
            !developmentChains.includes(network.name) &&
            process.env.ETHERSCAN_API_KEY
        ) {
            await verify(fundMe.address, args)
        }

        log("-------------------------")
    }

    module.exports.tags = ["all", "fundme"] // runned with all, and fundme tags
