const { assert } = require("chai");

const PresaleDBT = artifacts.require("PresaleDBT");
const Digibytes = artifacts.require("Digibytes");
// const { assert } = require('chai')
// const chai = require('chai')

contract('PresaleDBT', async (accounts)=>{
    const secondsInADay = 86400;
    const secondInAMonth = 2.628e6;
    let presale;
    let token;
    const priceDBT = web3.utils.toWei("0.00007").toString()
    const wallet = accounts[0]
    const amountDBTPresale = web3.utils.toWei("100000000").toString()
    const startTime = (Math.trunc(Date.now()/ 1000) + secondsInADay).toString();
    const endTime = (parseInt(startTime) + secondsInADay * 7).toString();

    before(async () => {
        token = await Digibytes.deployed()
        presale = await PresaleDBT.new(
            token.address,
            startTime,
            endTime,
            wallet,
            priceDBT,
            amountDBTPresale
        )
        await token.setPresaleAddress(presale.address)
        await presale.mockRound1StartTime(
            (parseInt(startTime) - secondsInADay * 2).toString(),
            {from: accounts[0]}
        )
        await token.transfer(presale.address, amountDBTPresale, {from: accounts[0]})
    })

   
    it("Should buy 1 DBT", async () => {
        const contractAddress = presale.address;
        const userAddress = accounts[9];
        //we creating a message from contractAddress and userAddress
        //with message and owner we sign our transaction
        const message = web3.utils.soliditySha3(contractAddress, userAddress);
        const sign = await web3.eth.sign(message, accounts[0])
        const r = sign.substr(0, 66)
        const s = '0x' + sign.substr(66, 64);
        const v = web3.utils.toDecimal("0x" + (sign.substr(130,2) == 0 ? "1b" : "1c"));
        //manually changing time because startTime is time.now by default
        await presale.mockRound1StartTime(
            ((new Date("2022-01-09 10:00:00 +0300")) / 1000).toString(),
            {from: accounts[0]}
        )
        //buying with sign
        await presale.buyDBTRound1(v, r, s, {from: accounts[9], value: priceDBT});//* 10**18
        //check amount
        const amount = await token.balanceOf(accounts[9], {from: accounts[9]})
        assert.equal(amount.toString(), web3.utils.toWei("1").toString(), "True")
    })

    it("Checks changing price", async () => {
        //we are change rounds prices
        const instance = await PresaleDBT.deployed();
        let newPriceRound1 = web3.utils.toWei("0.04").toString()//new price 0.04 BNB
        await instance.changePriceRound1(newPriceRound1, {from: accounts[0]})
        let price1 = await instance.getRound1Price({from: accounts[0]})
        assert.equal(newPriceRound1, price1.toString())
    })

})