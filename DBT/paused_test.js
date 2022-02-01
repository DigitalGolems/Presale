const PresaleDBT = artifacts.require("PresaleDBT");
const Digibytes = artifacts.require("Digibytes");
const { assert } = require("chai");
const {
    catchRevert,            
    catchOutOfGas,          
    catchInvalidJump,       
    catchInvalidOpcode,     
    catchStackOverflow,     
    catchStackUnderflow,   
    catchStaticStateChange
} = require("../../utils/catch_error.js")


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
        await token.transfer(presale.address, amountDBTPresale, {from: accounts[0]})
        await token.setPresaleAddress(presale.address)
        const contractAddress = presale.address;
        const userAddress = accounts[9];
        const message = web3.utils.soliditySha3(contractAddress, userAddress);
        const sign = await web3.eth.sign(message, accounts[0])
        const r = sign.substr(0, 66)
        const s = '0x' + sign.substr(66, 64);
        const v = web3.utils.toDecimal("0x" + (sign.substr(130,2) == 0 ? "1b" : "1c"));
        await presale.mockRound1StartTime(
            (parseInt(startTime) - secondsInADay * 2).toString(),
            {from: accounts[0]}
        )
        await presale.buyDBTRound1(v, r, s, {from: accounts[9], value: priceDBT});
    })

    it("Should be same balance", async () => {
        const balanceOf9Before = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        const balanceOf8Before = (await token.balanceOf(accounts[8], {from: accounts[8]})).toString()
        catchRevert(token.transfer(
            accounts[8],
            balanceOf9Before.toString(),
            {from: accounts[9]}
        ))
        const balanceOf9After = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        const balanceOf8After = (await token.balanceOf(accounts[8], {from: accounts[8]})).toString()
        assert.equal(balanceOf9Before, balanceOf9After)
        assert.equal(balanceOf8Before, balanceOf8After)
    })

    it("Should send to game", async ()=>{
        const balanceOf9Before = 
            web3.utils.fromWei((await token.balanceOf(accounts[9], {from: accounts[9]})).toString())
        const someExampleGameAddress = "0xdD870fA1b7C4700F2BD7f44238821C26f7392148"
        await token.addNotPausedAddress(someExampleGameAddress, {from: accounts[0]})
        const amount = web3.utils.toWei("0.5").toString()
        await token.transfer(
            someExampleGameAddress,
            amount,
            {from: accounts[9]}
        )
        const gameBalance = (await token.balanceOf(someExampleGameAddress)).toString()
        const balanceOf9After = web3.utils.fromWei((await token.balanceOf(accounts[9], {from: accounts[9]})).toString())
        assert.equal(gameBalance, amount)
        assert.equal((parseFloat(balanceOf9Before) - parseFloat(web3.utils.fromWei(amount))), parseFloat(balanceOf9After))
    })

    it("Should change paused time on minus 7 month", async () => {
        //paused balance and balance equal
        //because now user cant use his money (month has not passed yet)
        const pausedBalance1 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1,
            balance1
        )
        //to check that it truly blocked
        catchRevert(token.transfer(
            accounts[8],
            web3.utils.toWei("0.0001").toString(),
            {from: accounts[9]}
        ))
        //checks balances after transfer
        //should be same that before
        const pausedBalance1AfterTransfer = 
            (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1AfterTransfer = 
            (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1AfterTransfer,
            pausedBalance1
        )
        assert.equal(
            balance1AfterTransfer,
            balance1
        )
        //dicrease time when blocked on 1 month 
        const minus7Month = (parseInt(startTime) - (secondInAMonth * 7) - secondsInADay).toString()
        await token.mockPaused(
            minus7Month,
            accounts[9],
            {from: accounts[0]}
        )
        //we already unblock 30% of balance
        //to change paused balance need to transfer
        const amount1 = web3.utils.toWei("0.1").toString()
        await token.transfer(
            accounts[8],
            amount1,
            {from: accounts[9]}
        )

        //check that time dicreased on 1 month
        const month7GetUnblock = (await token.pausedMonth(accounts[9], 7,{from: accounts[0]})).toString()
        assert.equal(month7GetUnblock, "true")
        //paused balance should be dicreased on 30%
        //to check this get 30% from first paused balance
        //and substact new paused balance
        //from the first paused balance
        const pausedBalance2 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance2 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            (parseInt(pausedBalance1) * 30 / 100), //30%
            parseInt(pausedBalance1) - parseInt(pausedBalance2)
            )
        //also checks that balanceBefore minus sended amount
        //equal to balance after
        assert.equal(
            parseInt(balance1) - parseInt(amount1),
            parseInt(balance2)
        )
        //sending the remaining amount that user can send in this month
        const amount2 = web3.utils.toWei("0.05").toString()
        await token.transfer(
            accounts[8],
            amount2,
            {from: accounts[9]}
        )
        //if new paused balance and balance equals
        //that mean he used up not paused balance
        const pausedBalance3 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance3 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance3,
            balance3
        )
        //transaction not goes -  he used up not paused balance
        await catchRevert(
            token.transfer(
                accounts[8],
                web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
    })

    it("Should change paused time on minus 8 month", async () => {
        //if paused balance changes every time its unblock
        //alwaysBalance changes only when we send to notPausedAccounts
        //every time we take percent from alwaysBalance
        const alwaysBalance = (await token.getSomeAlwaysAmount(accounts[9])).toString()
        //do the same thing with second month
        const pausedBalance1 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1,
            balance1
        )
        await catchRevert(
            token.transfer(
            accounts[8],
            web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
        //checks balances after transfer
        //should be same that before
        const pausedBalance1AfterTransfer = 
            (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1AfterTransfer = 
            (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1AfterTransfer,
            pausedBalance1
        )
        assert.equal(
            balance1AfterTransfer,
            balance1
        )
        const minus8Month = (parseInt(startTime) - (secondInAMonth *8) - secondsInADay).toString()
        await token.mockPaused(
            minus8Month,
            accounts[9],
            {from: accounts[0]}
        )
        const amount3 = (parseInt(alwaysBalance) * 30 / 100).toString() // 30% of paused balance
        await token.transfer(
            accounts[8],
            amount3,
            {from: accounts[9]}
        )
        const month8GetUnblock = (await token.pausedMonth(accounts[9], 8,{from: accounts[0]})).toString()
        assert.equal(month8GetUnblock, "true")
        const balance4 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        const pausedBalance4 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            balance4,
            pausedBalance4
        )
        //transaction not goes -  he used up not paused balance
        await catchRevert(
            token.transfer(
                accounts[8],
                web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
    })

    it("Should change paused time on minus 9 month", async () => {
        //here we can use all balance
        const alwaysBalance = (await token.getSomeAlwaysAmount(accounts[9])).toString()
        const pausedBalance1 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1,
            balance1
        )
        await catchRevert(
            token.transfer(
            accounts[8],
            web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
        //checks balances after transfer
        //should be same that before
        const pausedBalance1AfterTransfer = 
            (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1AfterTransfer = 
            (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1AfterTransfer,
            pausedBalance1
        )
        assert.equal(
            balance1AfterTransfer,
            balance1
        )
        const minus9Month = (parseInt(startTime) - (secondInAMonth * 9) - secondsInADay).toString()
        await token.mockPaused(
            minus9Month,
            accounts[9],
            {from: accounts[0]}
        )
        const amount3 = (parseInt(alwaysBalance) * 30 / 100).toString() // 30% of paused balance
        await token.transfer(
            accounts[8],
            amount3,
            {from: accounts[9]}
        )
        const month9GetUnblock = (await token.pausedMonth(accounts[9], 9,{from: accounts[0]})).toString()
        assert.equal(month9GetUnblock, "false") //because we change pausedbalance to 0
        const balance4Before = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        const pausedBalance4 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance4,
            "0"
        )
        //transaction goes -  his paused balance equal 0
        await token.transfer(
            accounts[8],
            balance4Before,
            {from: accounts[9]}
        )
        const balance4After = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            balance4After,
            "0"
        )
    })

    it("Check if we can use all balance after 9 month, without using previous", async ()=>{
        //buy on presale tokens again
        const contractAddress = presale.address;
        const userAddress = accounts[9];
        const message = web3.utils.soliditySha3(contractAddress, userAddress);
        const sign = await web3.eth.sign(message, accounts[0])
        const r = sign.substr(0, 66)
        const s = '0x' + sign.substr(66, 64);
        const v = web3.utils.toDecimal("0x" + (sign.substr(130,2) == 0 ? "1b" : "1c"));
        await presale.mockRound1StartTime(
            (parseInt(startTime) - secondsInADay * 2).toString(),
            {from: accounts[0]}
        )
        await presale.buyDBTRound1(v, r, s, {from: accounts[9], value: priceDBT});
        //here we can use all balance
        const alwaysBalance = (await token.getSomeAlwaysAmount(accounts[9])).toString()
        const pausedBalance1 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1,
            balance1
        )
        await catchRevert(
            token.transfer(
            accounts[8],
            web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
        //checks balances after transfer
        //should be same that before
        const pausedBalance1AfterTransfer = 
            (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1AfterTransfer = 
            (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1AfterTransfer,
            pausedBalance1
        )
        assert.equal(
            balance1AfterTransfer,
            balance1
        )
        const minus9Month = (parseInt(startTime) - (secondInAMonth * 9) - secondsInADay).toString()
        await token.mockPaused(
            minus9Month,
            accounts[9],
            {from: accounts[0]}
        )
        const balance4Before = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        //transaction goes -  his paused balance equal 0
        await token.transfer(
            accounts[8],
            balance4Before,
            {from: accounts[9]}
        )
        const balance4After = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            balance4After,
            "0"
        )
    })

    it("Check if we can use 60% balance after 8 month, without using previous", async ()=>{
        //buy on presale tokens again
        const contractAddress = presale.address;
        const userAddress = accounts[9];
        const message = web3.utils.soliditySha3(contractAddress, userAddress);
        const sign = await web3.eth.sign(message, accounts[0])
        const r = sign.substr(0, 66)
        const s = '0x' + sign.substr(66, 64);
        const v = web3.utils.toDecimal("0x" + (sign.substr(130,2) == 0 ? "1b" : "1c"));
        await presale.mockRound1StartTime(
            (parseInt(startTime) - secondsInADay * 2).toString(),
            {from: accounts[0]}
        )
        await presale.buyDBTRound1(v, r, s, {from: accounts[9], value: priceDBT});
        //here we can use all balance
        const alwaysBalance = (await token.getSomeAlwaysAmount(accounts[9])).toString()
        const pausedBalance1 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1,
            balance1
        )
        await catchRevert(
            token.transfer(
            accounts[8],
            web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
        //checks balances after transfer
        //should be same that before
        const pausedBalance1AfterTransfer = 
            (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        const balance1AfterTransfer = 
            (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            pausedBalance1AfterTransfer,
            pausedBalance1
        )
        assert.equal(
            balance1AfterTransfer,
            balance1
        )
        const minus8Month = (parseInt(startTime) - (secondInAMonth *8) - secondsInADay).toString()
        await token.mockPaused(
            minus8Month,
            accounts[9],
            {from: accounts[0]}
        )
        const amount3 = (parseInt(alwaysBalance) * 60 / 100).toString() // 30% of paused balance
        await token.transfer(
            accounts[8],
            amount3,
            {from: accounts[9]}
        )
        const month8GetUnblock = (await token.pausedMonth(accounts[9], 8,{from: accounts[0]})).toString()
        assert.equal(month8GetUnblock, "true")
        const balance4 = (await token.balanceOf(accounts[9], {from: accounts[9]})).toString()
        const pausedBalance4 = (await token.pausedBalanceOf(accounts[9], {from: accounts[9]})).toString()
        assert.equal(
            balance4,
            pausedBalance4
        )
        //transaction not goes -  he used up not paused balance
        await catchRevert(
            token.transfer(
                accounts[8],
                web3.utils.toWei("0.0001").toString(),
                {from: accounts[9]}
            )
        )
    })

    }
)