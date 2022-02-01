const { catchRevert } = require("../../utils/catch_error");

const PresaleDIG = artifacts.require("PresaleDIG");
const DIG = artifacts.require("DigitalGolems")
// const { assert } = require('chai')
// const chai = require('chai')

contract('PresaleDIG', async (accounts)=>{
    const secondsInADay = 86400;
    const secondInAMonth = 2.628e6;
    let presale;
    let token;
    const wallet = accounts[0]
    const amountDBTPresale = web3.utils.toWei("100000000").toString()
    const startTime = (Math.trunc(Date.now()/ 1000) + secondsInADay).toString();
    const endTime = (parseInt(startTime) + secondsInADay * 7).toString();
    const owner = accounts[0]
    const player1 = accounts[9]
    const player2 = accounts[8]
    const tokenURIs = [
        "https://ipfs.io/ipfs/QmUdTP3VBY5b9u1Bdc3AwKggQMg5TQyNXVfzgcUQKjdmRH",
        "https://ipfs.io/ipfs/QmQ4SmLdMF64B1nVRVTGHEYcQUnv3tXFqfy5hZNSKXUdDY",
        "https://ipfs.io/ipfs/QmVZFZfzgf9aE3wQKSq6yG9aQMo6kSSGittYy1yp1u4Urr"
    ]
    const kinds = [1, 2, 3]
    const series = [1, 2, 3]
    const kindSeries = [kinds, series]

    before(async () => {
        presale = await PresaleDIG.deployed()
        token = await DIG.deployed()
        await token.setPresaleAddress(presale.address, {from: owner})
        await presale.mockRound1StartTime(
            (parseInt(startTime) - secondsInADay * 2).toString(),
            {from: accounts[0]}
        )
    })

    it("Should buy and mint NFT to signed user", async ()=> {
        const contractAddress = presale.address;
        const message = web3.utils.soliditySha3(
            contractAddress,
            tokenURIs[0], 
            player1);
        // console.log(message)
        const sign = await web3.eth.sign(message, owner)
        const r = sign.substr(0, 66)
        const s = '0x' + sign.substr(66, 64);
        const v = web3.utils.toDecimal("0x" + (sign.substr(130,2) == 0 ? "1b" : "1c"));//до сюда, делается серваком
        const rs = [r, s]
        const price = 
            (await presale.getRound1Price()).toString()
        const value = parseInt(price) * tokenURIs.length
        await presale.buyDIGRound1(
            tokenURIs,
            v,
            rs,
            kindSeries,
            {from: player1, value}
        )
        const balanceNFTPlayer1 = (await token.balanceOf(player1)).toString()
        const balanceCardPlayer1 = (await token.cardCount(player1)).toString()
        assert.equal(
            (3).toString(),
            balanceNFTPlayer1
        )
        assert.equal(
            (3).toString(),
            balanceCardPlayer1
        )
    })

    it("Shouldn't buy and mint 'cause its not signed user", async ()=>{
        const contractAddress = presale.address;
        const message = web3.utils.soliditySha3(
            contractAddress,
            "someURI", 
            player2);
        // console.log(message)
        const sign = await web3.eth.sign(message, owner)
        const r = sign.substr(0, 66)
        const s = '0x' + sign.substr(66, 64);
        const v = web3.utils.toDecimal("0x" + (sign.substr(130,2) == 0 ? "1b" : "1c"));//до сюда, делается серваком
        const rs = [r, s]
        const price = 
            (await presale.getRound1Price()).toString()
        const value = parseInt(price) * tokenURIs.length
        catchRevert(presale.buyDIGRound1(
            tokenURIs,
            v,
            rs,
            kindSeries,
            {from: player2, value}
        ))
        const balancePlayer2 = (await token.balanceOf(player2)).toString()
        assert.equal(
            (0).toString(),
            balancePlayer2
        )
    })

})