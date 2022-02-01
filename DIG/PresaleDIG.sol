// SPDX-License-Identifier: GPL-3.0

pragma experimental ABIEncoderV2;
pragma solidity ^0.8.10;

import "../DigitalGolems/DigitalGolems.sol";
import "../Utils/Owner.sol";
import "../Utils/ControlledAccess.sol";


contract PresaleDIG is Owner, ControlledAccess  {

    using SafeMath for uint256;
   
    DigitalGolems private DIG;
        
    uint public startTimeRound1;
    uint public endTimeRound1;
    uint public priceRound1;
    bool public round1End;
    uint16 public amountToBuyRound1;

    uint public startTimeRound2;
    uint public endTimeRound2;
    uint public priceRound2;
    bool public round2End;
    uint16 public amountToBuyRound2;

    uint public startTimeRound3;
    uint public endTimeRound3;
    uint public priceRound3;
    bool public round3End;
    uint16 public amountToBuyRound3;

    uint public tokenSold;
    address payable wallet;

    event TransferPresaleToken(address _sender,uint _amount);
    event PresaleRoundEnd(uint8 _round, uint256 _time);
    event ChangePrice(uint256 _lastPrice, uint256 _newPrice, uint8 _round);
    event ChangeRoundTime(bool isStartTime,uint256 _lastTime, uint256 _newTime, uint8 _round);
    event WithdrawBNB(uint256 _amount);

    constructor(
        address token_,
        uint256[] memory startTime_, 
        uint256[] memory endTime_,
        address wallet_,
        uint256[] memory price_,
        uint16[] memory tokenAmount_
    )
    {
        require(token_ != address(0), "Token is not address(0)");
        require(startTime_.length == 3);
        require(endTime_.length == 3);        
        require(price_.length == 3);
        require(tokenAmount_.length == 3);
        for (uint8 i = 0; i < 3; i++) {
            require(startTime_[i] >= block.timestamp, "Start time in past");
            require(endTime_[i] >= startTime_[i], "End time is less start time");
        }
        for (uint8 i = 0; i < 3; i++) {
            require(price_[i] > 0, "Price can't be less than 0");
        }
        for (uint8 i = 0; i < 3; i++) {
            require(tokenAmount_[i] > 0, "Amount can't be less than 0");
        }
        require(wallet_ != address(0), "Wallet is not address(0)");
        DIG = DigitalGolems(token_);
        startTimeRound1 = startTime_[0];
        endTimeRound1 = endTime_[0];
        startTimeRound2 = startTime_[1];
        endTimeRound2 = endTime_[1];
        startTimeRound3 = startTime_[2];
        endTimeRound3 = endTime_[2];
        priceRound1 = price_[0];
        priceRound2 = price_[1];
        priceRound3 = price_[2];
        amountToBuyRound1 = tokenAmount_[0];
        amountToBuyRound2 = tokenAmount_[1];
        amountToBuyRound3 = tokenAmount_[2];
        wallet = payable(wallet_);
    }

    modifier onlyWhileOpenRound1() {
        require(round1End != true, "Round or Presale is over");
        require(block.timestamp >= startTimeRound1 && block.timestamp <= endTimeRound1, "Round or Presale is over or not started");
        _;
    }

    modifier onlyWhileOpenRound2() {
        require(round2End != true, "Round or Presale is over");
        require(block.timestamp >= startTimeRound2 && block.timestamp <= endTimeRound2, "Round or Presale is over or not started");
        _;
    }

    modifier onlyWhileOpenRound3() {
        require(round3End != true, "Round or Presale is over");
        require(block.timestamp >= startTimeRound3 && block.timestamp <= endTimeRound3, "Round or Presale is over or not started");
        _;
    }

    fallback() external payable{}
    receive() external payable{}

    function buyDIGRound1(
        string[] memory tokenURIs, 
        uint8 _v,
        bytes32[] memory rs,
        uint8[][] memory kindSeries
    ) 
        public 
        payable 
        onlyValidMint(_v, rs[0], rs[1], tokenURIs[0], msg.sender) 
        onlyWhileOpenRound1
    {
        require(tokenSold < amountToBuyRound1);
        require(msg.value >= priceRound1 * tokenURIs.length);
        uint256 _amount = tokenURIs.length;
        for (uint8 i = 0; i < _amount; i++) {
            DIG.mintPresale(
                msg.sender, 
                tokenURIs[i],
                kindSeries[0][i],
                kindSeries[1][i]
            );
        }
        tokenSold = tokenSold.add(_amount);
        wallet.transfer(msg.value);
        emit WithdrawBNB(msg.value);
        emit TransferPresaleToken(msg.sender, _amount);
        return;
    }
    

    // function buyDBTRound2(uint _amount) public payable {
    //     require(round2End == false, "Second round ends");
    //     require(block.timestamp > endTimeRound1, "First round still goes");
    //     require(block.timestamp < endTimeRound2, "Second round not started");
    //     require(msg.value == _amount * priceRound2);
    //     DBT.transfer(msg.sender, _amount);
    //     DBT.addPaused(_amount, block.timestamp, msg.sender);
    //     tokenSold = tokenSold.add(_amount);
    //     emit TransferPresaleToken(msg.sender, _amount);
    //     return;
    // }

    // function buyDBTRound3(uint _amount) public payable {
    //     require(round3End == false, "Third round ends");
    //     require(block.timestamp > endTimeRound2, "Second round still goes");
    //     require(block.timestamp < endTimeRound3, "Third round not started");
    //     require(msg.value == _amount * priceRound3);
    //     DBT.transfer(msg.sender, _amount);
    //     DBT.addPaused(_amount, block.timestamp, msg.sender);
    //     tokenSold = tokenSold.add(_amount);
    //     emit TransferPresaleToken(msg.sender, _amount);
    //     return;
    // }

    function changeRound1StartTime(uint256 _time) external isOwner {
        require(_time >= block.timestamp, "Start time in past");
        uint256 lastTime = startTimeRound1;
        startTimeRound1 = _time;
        emit ChangeRoundTime(true, lastTime, _time, 1);
    }

    function changeRound1EndTime(uint256 _time) external isOwner {
        require(_time >= startTimeRound1, "End time is less start time");
        uint256 lastTime = startTimeRound1;
        endTimeRound1 = _time;
        emit ChangeRoundTime(false, lastTime, _time, 1);
    }

    function changeRound2StartTime(uint256 _time) external isOwner {
        require(_time >= block.timestamp, "Start time in past");
        uint256 lastTime = startTimeRound2;
        startTimeRound2 = _time;
        emit ChangeRoundTime(true, lastTime, _time, 2);
    }

    function changeRound2EndTime(uint256 _time) external isOwner {
        require(_time >= startTimeRound2, "End time is less start time");
        uint256 lastTime = startTimeRound2;
        endTimeRound2 = _time;
        emit ChangeRoundTime(false, lastTime, _time, 2);
    }

    function changeRound3StartTime(uint256 _time) external isOwner {
        require(_time >= block.timestamp, "Start time in past");
        uint256 lastTime = startTimeRound3;
        startTimeRound3 = _time;
        emit ChangeRoundTime(true, lastTime, _time, 3);
    }

    function changeRound3EndTime(uint256 _time) external isOwner {
        require(_time >= startTimeRound3, "End time is less start time");
        uint256 lastTime = startTimeRound3;
        endTimeRound3 = _time;
        emit ChangeRoundTime(false, lastTime, _time, 3);
    }

    //ONLY FOR TESTING
    function mockRound1StartTime(uint256 _time) external isOwner {
        startTimeRound1 = _time;
    }

    //ONLY FOR TESTING  
    function mockRound1EndTime(uint256 _time) external isOwner {
        endTimeRound1 = _time;
    }

    //ONLY FOR TESTING
    function mockRound2StartTime(uint256 _time) external isOwner {
        startTimeRound2 = _time;
    }

    //ONLY FOR TESTING  
    function mockRound2EndTime(uint256 _time) external isOwner {
        endTimeRound2 = _time;
    }

    //ONLY FOR TESTING
    function mockRound3StartTime(uint256 _time) external isOwner {
        startTimeRound3 = _time;
    }

    //ONLY FOR TESTING  
    function mockRound3EndTime(uint256 _time) external isOwner {
        endTimeRound3 = _time;
    }

    function hasRound1Closed() public view returns(bool) {
        return block.timestamp > endTimeRound1;
    }

    function hasRound2Closed() public view returns(bool) {
        return block.timestamp > endTimeRound2;
    }

    function hasRound3Closed() public view returns(bool) {
        return block.timestamp > endTimeRound3;
    }

    function closeRound1Presale() public isOwner {
        round1End = true;
        emit PresaleRoundEnd(1, block.timestamp);
    }

    function closeRound2Presale() public isOwner {
        round2End = true;
        emit PresaleRoundEnd(2, block.timestamp);
    }

    function closeRound3Presale() public isOwner {
        round3End = true;
        emit PresaleRoundEnd(3, block.timestamp);
    }

    function changeTokenAddress(address _new) external isOwner {
        DIG = DigitalGolems(_new);
    }

    function changePriceRound1(uint256 _price) external isOwner {
        require(_price > 0, "Price less than 0");
        uint256 _lastPrice = priceRound1;
        priceRound1 = _price;
        emit ChangePrice(_lastPrice, _price, 1);
    }

    function changePriceRound2(uint256 _price) external isOwner {
        require(_price > 0, "Price less than 0");
        uint256 _lastPrice = priceRound2;
        priceRound2 = _price;
        emit ChangePrice(_lastPrice, _price, 1);
    }

    function changePriceRound3(uint256 _price) external isOwner {
        require(_price > 0, "Price less than 0");
        uint256 _lastPrice = priceRound3;
        priceRound3 = _price;
        emit ChangePrice(_lastPrice, _price, 1);
    }

    function getRound1Price() public view returns(uint256) {
        return priceRound1;
    }

    function getRound2Price() public view returns(uint256) {
        return priceRound2;
    }

    function getRound3Price() public view returns(uint256) {
        return priceRound3;
    }

    function getRound1StartTime() public view returns(uint256){
        return startTimeRound1;
    }

    function getRound1EndTime() public view returns(uint256){
        return endTimeRound1;
    }

    function getRound2StartTime() public view returns(uint256){
        return startTimeRound2;
    }

    function getRound2EndTime() public view returns(uint256){
        return endTimeRound2;
    }

    function getRound3StartTime() public view returns(uint256){
        return startTimeRound3;
    }

    function getRound3EndTime() public view returns(uint256){
        return endTimeRound3;
    }

    function getSold() public view isOwner returns(uint256) {
        return tokenSold;
    }
}