const PresaleDBT = artifacts.require("PresaleDBT");
const Digibytes = artifacts.require("Digibytes");
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
    let startTime = (Math.trunc(Date.now()/ 1000) + secondsInADay).toString();
    let endTime = (parseInt(startTime) + secondsInADay * 7).toString();

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
        startTime = (await presale.getRound1StartTime()).toString()
        await token.transfer(presale.address, amountDBTPresale, {from: accounts[0]})
    })

    it("Should be right time", async () => {
        //checks if we deployed with right time
        const startTimeFromContract = (await presale.getRound1StartTime()).toString()
        const endTimeFromContract = (await presale.getRound1EndTime()).toString()
        assert.equal(startTime, startTimeFromContract)
        assert.equal(endTime, endTimeFromContract)
    })

    it("Should abort with an error(new start time less than time.now)", async ()=>{
        const newStartTime = (Math.trunc(Date.now()/ 1000) - secondsInADay).toString();
        //error 'cause startTime less than time.now
        await catchRevert(presale.changeRound1StartTime(
            newStartTime,
            {from: accounts[0]}
        ))
    })

    it("Should abort with an error(new end time less than start time)", async ()=>{
        const newEndTime = (Math.trunc(Date.now()/ 1000) - secondsInADay * 2).toString();
        //error 'cause endTime less than startTime
        await catchRevert(presale.changeRound1EndTime(
            newEndTime,
            {from: accounts[0]}
        ))
    })

    it("Should change start time", async ()=>{
        //change start time
        const newStartTime = (Math.trunc(Date.now()/ 1000) + secondsInADay * 7).toString();
        await presale.changeRound1StartTime(
            newStartTime,
            {from: accounts[0]}
        )
        const getStartTime = (await presale.getRound1StartTime()).toString()
        //checks if new start time is right
        assert.equal(newStartTime, getStartTime)
    })

    it("Should change end time", async ()=>{
        //change end time
        const newEndTime = (Math.trunc(Date.now()/ 1000) + secondsInADay * 14).toString();
        await presale.changeRound1EndTime(
            newEndTime,
            {from: accounts[0]}
        )
        const getEndTime = (await presale.getRound1EndTime()).toString()
        //checks if new end time is right
        assert.equal(newEndTime, getEndTime)
    })

    it("Should be not closed", async () => {
        //checks if it not close
        assert.equal(
            false,
            await presale.hasClosed()
        )
    })

    it("Should be closed", async () => {
        //change manually time
        await presale.mockRound1EndTime(
            (Math.trunc(Date.now()/ 1000) - secondsInADay).toString(),
            {from: accounts[0]}
        )
        //and check if it really close
        assert.equal(
            true,
            await presale.hasClosed()
        )
    })
    
})