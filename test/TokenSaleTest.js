const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSale", function () {
    let token, tokenSale, owner, buyer , deployer;
    const TOKEN_PRICE = 0.01;
    const TOKENS_TO_BUY = 10; // Buying 10 tokens

    beforeEach(async function () {
        [ deployer , owner, buyer] = await ethers.getSigners();          
        
        // Deploy MyToken contract         
        const Token = await ethers.getContractFactory("MyToken");
        token = await Token.deploy();
        await token.waitForDeployment();
        
        // Deploy TokenSale contract        
        const TokenSale = await ethers.getContractFactory("TokenSale");
        tokenSale = await TokenSale.deploy(token.getAddress()); // Pass the token address
        await tokenSale.waitForDeployment();
    
        await token.connect(deployer).transfer(tokenSale.getAddress(),ethers.parseEther(TOKENS_TO_BUY.toString()));
    });

    it("Should verify token name and symbol", async function () {  
        const initialBuyerBalance = await token.balanceOf(tokenSale.getAddress());
        console.log('token',initialBuyerBalance)
        expect(await token.name()).to.equal("MyToken");
        expect(await token.symbol()).to.equal("MTK");
    });

    it("Should verify total token supply", async function () {
        const totalSupply = ethers.parseEther("21000000"); // 21 million tokens
        expect(await token.totalSupply()).to.equal(totalSupply);
    }); 

    it("Should allow a buyer to purchase tokens", async function () {

        const ethAmount = TOKENS_TO_BUY * TOKEN_PRICE; 
        const ethAmountBN = ethers.parseEther(ethAmount.toString());
        
        
        await tokenSale.connect(buyer).buyTokens(TOKENS_TO_BUY, {
            value: ethAmountBN,
        });

        const purchases = await tokenSale.purchases(buyer.address, 0);
        
        expect(purchases.amount).to.equal(TOKENS_TO_BUY);
    });

    it("Should not allow claiming tokens before 365 days", async function () {
        const ethAmount = TOKENS_TO_BUY * TOKEN_PRICE; 
        const ethAmountBN = ethers.parseEther(ethAmount.toString());

        await tokenSale.connect(buyer).buyTokens(TOKENS_TO_BUY, {
            value: ethAmountBN,
        });

        await expect(tokenSale.connect(buyer).claimTokens()).to.be.revertedWith("No tokens to claim");
    });

    it("Should allow claiming tokens after 365 days", async function () {
        const ethAmount = TOKENS_TO_BUY * TOKEN_PRICE; 
        const ethAmountBN = ethers.parseEther(ethAmount.toString());
        
        await tokenSale.connect(buyer).buyTokens(TOKENS_TO_BUY, {
            value: ethAmountBN,
        });

        // Fast forward time by 365 days
        const ONE_YEAR = 365 * 24 * 60 * 60; // 365 days in seconds
        await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
        await ethers.provider.send("evm_mine");

        await expect(tokenSale.connect(buyer).claimTokens())
            .to.emit(tokenSale, "TokensClaimed")
            .withArgs(buyer.address, TOKENS_TO_BUY);

        const balance = await token.balanceOf(buyer.address);
        expect(balance).to.equal(TOKENS_TO_BUY);
    });
});