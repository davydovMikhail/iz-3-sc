// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakeToken is ERC20 {

    uint256 constant aHour = 1 hours;
    uint256 constant aDay = 24 hours;
    uint constant precision = 1000000000;

    struct User {
        uint stakedAmount;
        uint stakeTime;
        uint claimTime;
    }

    mapping(address => User) public users;

    constructor(
        uint256 _initialSupply
    ) ERC20("MyTestCoint", "MTC") {
        _mint(msg.sender, _initialSupply);
    }

    function stake(uint256 _amount) external {
        address sender = _msgSender();
        User storage info = users[sender];
        uint currentTime = block.timestamp;
        require(_amount > 0, "Amount must be greater then zero.");
        // require(info.stakedAmount == 0, "Your tokens is staked arleady.");
        _transfer(sender, address(this), _amount);
        info.stakedAmount += _amount;
        info.stakeTime = currentTime;
        info.claimTime = currentTime;
    }

    function claim() external {
        address sender = _msgSender();
        uint currentTime = block.timestamp;
        User storage info = users[sender];
        require(info.stakedAmount > 0, "Your tokens is not staked yet.");
        uint distantSeconds = currentTime - info.claimTime;
        require(distantSeconds >= aHour, "It's been less than an hour.");
        uint share = _calcRewards(info.stakedAmount, distantSeconds);
        _mint(sender, share); 
        info.claimTime = currentTime;
    }

    function _calcRewards(uint _stakedAmount, uint _seconds) internal pure returns(uint share) {
        uint hoursQuantity = ((_seconds * precision) / aHour); // 1000000000 * hoursQuantity
        uint sharePerHour = (_stakedAmount * 100) / 1000;
        share = (hoursQuantity * sharePerHour) / precision;
    }

    function unstake() external { 
        address sender = _msgSender();
        User storage info = users[sender];
        require(info.stakedAmount > 0, "Your tokens is not staked yet.");
        require(block.timestamp - info.stakeTime >= aDay, "The time for unstake has not yet come.");
        _transfer(address(this), sender, info.stakedAmount);
        info.stakedAmount = 0;
    }
}
