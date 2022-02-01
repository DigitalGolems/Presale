// SPDX-License-Identifier: GPL-3.0

pragma experimental ABIEncoderV2;
pragma solidity ^0.8.10;

// import "../ERC20/Digibytes.sol";
import "../Utils/SafeMath.sol";
import "../Utils/Owner.sol";
import "../Utils/ControlledAccess.sol";
import "../Digibytes/ERC20.sol";
import "../Digibytes/Digibytes.sol";


contract PresaleDBT is Owner, ControlledAccess {

    using SafeMath for uint256;
   
    Digibytes public DBT;
    
    uint public startTimeRound1;
    uint public endTimeRound1;
    uint public priceRound1;
    bool public round1End;
    
    address payable wallet;
    uint public tokenSold;
    uint public tokenAmount;

    event TransferPresaleToken(address _sender,uint _amount);
    event PresaleEnd(uint256 _time);
    event ChangePrice(uint256 _lastPrice, uint256 _newPrice);
    event ChangeRoundTime(bool isStartTime, uint256 _lastTime, uint256 _newTime);
    event WithdrawBNB(uint256 _amount);

    constructor(
        address token_,
        uint256 startTime_, 
        uint256 endTime_,
        address wallet_,
        uint256 price_,
        uint256 tokenAmount_
    )
    {
        require(token_ != address(0), "Token is not address(0)");
        require(startTime_ >= block.timestamp, "Start time in past");
        require(endTime_ >= startTime_, "End time is less start time");
        require(wallet_ != address(0), "Wallet is not address(0)");
        require(price_ > 0, "Price can't be less than 0");
        require(tokenAmount_ > 0, "Ampunt can't be less than 0");
        DBT = Digibytes(token_);
        startTimeRound1 = startTime_;
        endTimeRound1 = endTime_;
        wallet = payable(wallet_);
        priceRound1 = price_;
        tokenAmount = tokenAmount_;
    }

    fallback() external payable{}
    receive() external payable{}

    modifier onlyWhileOpen {
        require(round1End != true, "Presale is over");
        require(block.timestamp >= startTimeRound1 && block.timestamp <= endTimeRound1, "Presale is over or not started");
        _;
    }

    function buyDBTRound1(
        uint8 _v, 
        bytes32 _r, 
        bytes32 _s
    ) 
        public 
        payable 
        onlyValidAccess(_v, _r, _s) 
        onlyWhileOpen
    {
        require(msg.value >= priceRound1);
        //count amount from value
        uint256 _amount = (msg.value / priceRound1) * 10 ** 18;
        // require(_amount >= 500000);
        //transfer to buyer
        DBT.transfer(msg.sender, _amount);
        //add paused address
        DBT.addPaused(_amount, block.timestamp, msg.sender);
        tokenSold = tokenSold.add(_amount);
        //withdraw bnb
        wallet.transfer(msg.value);
        emit WithdrawBNB(msg.value);
        emit TransferPresaleToken(msg.sender, _amount);
        return;
    }
    
    function hasClosed() public view returns(bool) {
        return block.timestamp > endTimeRound1;
    }

    function closePresale() public isOwner {
        round1End = true;
        emit PresaleEnd(block.timestamp);
    }

    function changeTokenAddress(address _new) external isOwner {
        DBT = Digibytes(_new);
    }

    function withdrawDBT() external isOwner {
        uint256 amountDBT = DBT.balanceOf(address(this));
        DBT.transfer(owner, amountDBT);
    }

    function changePriceRound1(uint256 _price) external isOwner {
        require(_price > 0, "Price less than 0");
        uint256 _lastPrice = priceRound1;
        priceRound1 = _price;
        emit ChangePrice(_lastPrice, _price);
    }

    function getRound1Price() public view returns(uint256) {
        return priceRound1;
    }

    function changeRound1StartTime(uint256 _time) external isOwner {
        require(_time >= block.timestamp, "Start time in past");
        uint256 lastTime = startTimeRound1;
        startTimeRound1 = _time;
        emit ChangeRoundTime(true, lastTime, _time);
    }

    function changeRound1EndTime(uint256 _time) external isOwner {
        require(_time >= startTimeRound1, "End time is less start time");
        uint256 lastTime = startTimeRound1;
        endTimeRound1 = _time;
        emit ChangeRoundTime(false, lastTime, _time);
    }

    //ONLY FOR TESTING
    function mockRound1StartTime(uint256 _time) external isOwner {
        startTimeRound1 = _time;
    }

    //ONLY FOR TESTING  
    function mockRound1EndTime(uint256 _time) external isOwner {
        endTimeRound1 = _time;
    }

    function getRound1StartTime() public view returns(uint256){
        return startTimeRound1;
    }

    function getRound1EndTime() public view returns(uint256){
        return endTimeRound1;
    }

    function getSold() public view isOwner returns(uint256) {
        return tokenSold;
    }
}