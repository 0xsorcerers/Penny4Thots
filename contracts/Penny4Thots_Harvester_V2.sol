// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

/// @notice Minimal ERC20 interface used by the Harvester.
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        require(token.transfer(to, amount), "TRANSFER_FAILED");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        require(token.transferFrom(from, to, amount), "TRANSFER_FROM_FAILED");
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

abstract contract Ownable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner.");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner.");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/// @title Penny4Thots Harvester V2
/// @notice Multi-reward evolution of the Battledogs Harvester lazy staking design.
/// @dev One staking token determines weight; each mapped reward stream accounts independently.
contract Penny4ThotsHarvesterV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;

    uint256 public totalStaked = 1;
    uint256 public numberOfParticipants;
    uint256 public Duration = 604800;
    uint256 public timeLock = 604800;
    uint256 public totalStakeTax;
    uint256 public stakeTax;
    uint256 public rewardStreamCount;
    uint256 public immutable startTime;
    uint256 private constant DIVISOR = 100 ether;

    address private guard;
    address public treasury;
    bool public paused;

    struct StakePosition {
        uint256 amount;
        uint256 enteredAt;
        uint256 lastClaimedAt;
        bool active;
    }

    struct RewardStream {
        IERC20 payToken;
        bool exists;
        bool active;
        uint256 totalRewards;
        uint256 allRewardsOwed;
        uint256 totalClaimedRewards;
        uint256 rewardPerStamp;
        uint256 accumulator;
        uint256 lastUpdate;
        uint256 replenishTax;
        uint256 currentReplenish;
        uint256 totalReplenish;
    }

    struct RewardPosition {
        uint256 checkpoint;
        uint256 rewardsOwed;
        uint256 totalClaimed;
    }

    mapping(address => StakePosition) public stakes;
    mapping(address => bool) public blacklist;
    mapping(uint256 => RewardStream) public rewardStreams;
    mapping(address => uint256) public rewardStreamByToken;
    mapping(address => mapping(uint256 => RewardPosition)) public rewardPositions;

    event RewardStreamCreated(uint256 indexed id, address indexed payToken);
    event RewardStreamStatus(uint256 indexed id, bool active);
    event RewardsUpdated(uint256 indexed id, uint256 totalRewards, uint256 rewardPerStamp);
    event RewardAddedByDev(uint256 indexed id, uint256 amount);
    event RewardClaimedByUser(address indexed user, uint256 indexed id, uint256 amount);
    event AddStake(address indexed user, uint256 amount);
    event WithdrawStake(address indexed user, uint256 amount);
    event Pause();
    event Unpause();

    modifier onlyGuard() {
        require(msg.sender == guard, "Not authorized.");
        _;
    }

    modifier onlyAfterTimelock() {
        require(stakes[msg.sender].enteredAt + timeLock < block.timestamp, "Timelocked.");
        _;
    }

    modifier onlyClaimant() {
        require(stakes[msg.sender].lastClaimedAt + timeLock < block.timestamp, "Timelocked.");
        _;
    }

    constructor(address _stakingToken, address _treasury, address _guard) {
        require(_stakingToken != address(0), "Zero staking token.");
        require(_treasury != address(0), "Zero treasury.");
        require(_guard != address(0), "Zero guard.");
        stakingToken = IERC20(_stakingToken);
        treasury = _treasury;
        guard = _guard;
        startTime = block.timestamp;
    }

    function createRewardStream(address _payToken) external onlyOwner returns (uint256 id) {
        require(_payToken != address(0), "Zero payToken.");
        require(rewardStreamByToken[_payToken] == 0, "Stream exists.");

        rewardStreamCount += 1;
        id = rewardStreamCount;
        RewardStream storage stream = rewardStreams[id];
        stream.payToken = IERC20(_payToken);
        stream.exists = true;
        stream.active = true;
        stream.lastUpdate = block.timestamp;
        rewardStreamByToken[_payToken] = id;

        _setRewards(id);
        emit RewardStreamCreated(id, _payToken);
    }

    function addGAME(uint256 _amount) external nonReentrant {
        require(!paused, "Contract is paused.");
        require(_amount > 0, "Amount must be greater than zero.");
        require(!blacklist[msg.sender], "Address is blacklisted.");

        _settleUserAll(msg.sender);
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 toll = (_amount * stakeTax) / 100;
        uint256 amount = _amount - toll;
        totalStakeTax += toll;

        StakePosition storage position = stakes[msg.sender];
        if (!position.active) {
            position.active = true;
            numberOfParticipants += 1;
        }

        position.amount += amount;
        position.enteredAt = block.timestamp;
        totalStaked += amount;
        _syncUserCheckpoints(msg.sender);
        _setRewardsAll();

        emit AddStake(msg.sender, _amount);
    }

    function withdrawGAME() external nonReentrant onlyAfterTimelock {
        require(!paused, "Contract already paused.");
        StakePosition storage position = stakes[msg.sender];
        require(position.amount > 0, "No stake to withdraw.");

        _settleUserAll(msg.sender);

        uint256 amount = position.amount;
        position.amount = 0;
        position.enteredAt = 0;
        position.active = false;
        totalStaked -= amount;
        if (numberOfParticipants > 0) numberOfParticipants -= 1;

        _setRewardsAll();
        stakingToken.safeTransfer(msg.sender, amount);
        emit WithdrawStake(msg.sender, amount);
    }

    function addRewards(uint256 id, uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than zero.");
        RewardStream storage stream = _requireStream(id);
        _updateStream(id);
        stream.payToken.safeTransferFrom(msg.sender, address(this), _amount);
        _setRewards(id);
        emit RewardAddedByDev(id, _amount);
    }

    function getClaims(uint256[] calldata ids) external nonReentrant onlyClaimant {
        require(!paused, "Contract already paused.");
        require(!blacklist[msg.sender], "Address is blacklisted.");
        require(ids.length > 0, "No streams.");

        for (uint256 i = 0; i < ids.length; i++) {
            _claimOne(msg.sender, ids[i]);
        }

        stakes[msg.sender].lastClaimedAt = block.timestamp;
    }

    function pendingReward(address user, uint256 id) external view returns (uint256) {
        RewardStream storage stream = rewardStreams[id];
        RewardPosition storage position = rewardPositions[user][id];
        if (!stream.exists) return 0;

        uint256 projectedAccumulator = stream.accumulator;
        if (stream.active && totalStaked > 0 && block.timestamp > stream.lastUpdate) {
            projectedAccumulator += (block.timestamp - stream.lastUpdate) * stream.rewardPerStamp;
        }

        uint256 newlyAccrued = stakes[user].amount * (projectedAccumulator - position.checkpoint);
        return (position.rewardsOwed + newlyAccrued) / DIVISOR;
    }

    function resetRewards(uint256 id) external onlyOwner {
        _updateStream(id);
        _setRewards(id);
    }

    function setRewardStreamActive(uint256 id, bool active) external onlyOwner {
        RewardStream storage stream = _requireStream(id);
        _updateStream(id);
        stream.active = active;
        stream.lastUpdate = block.timestamp;
        _setRewards(id);
        emit RewardStreamStatus(id, active);
    }

    function setDuration(uint256 _seconds) external onlyOwner {
        require(_seconds > 0, "Zero duration.");
        _updateAllStreams();
        Duration = _seconds;
        _setRewardsAll();
    }

    function setTimeLock(uint256 _seconds) external onlyOwner {
        timeLock = _seconds;
    }

    function setTaxes(uint256 _stakeTax, uint256[] calldata ids, uint256[] calldata replenishTaxes) external onlyOwner {
        require(ids.length == replenishTaxes.length, "Length mismatch.");
        stakeTax = _stakeTax;
        for (uint256 i = 0; i < ids.length; i++) {
            _requireStream(ids[i]).replenishTax = replenishTaxes[i];
        }
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero treasury.");
        treasury = _treasury;
    }

    function addToBlacklist(address[] calldata _addresses) external onlyOwner {
        for (uint256 i = 0; i < _addresses.length; i++) blacklist[_addresses[i]] = true;
    }

    function removeFromBlacklist(address[] calldata _addresses) external onlyOwner {
        for (uint256 i = 0; i < _addresses.length; i++) blacklist[_addresses[i]] = false;
    }

    function withdraw(uint256 _binary, uint256 id, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero.");
        if (_binary > 1) {
            RewardStream storage stream = _requireStream(id);
            uint256 reserves = stream.payToken.balanceOf(address(this));
            require(reserves >= amount + stream.allRewardsOwed, "Not enough reserves.");
            stream.payToken.safeTransfer(msg.sender, amount);
            _setRewards(id);
        } else {
            require(amount <= totalStakeTax, "Max Exceeded.");
            totalStakeTax -= amount;
            stakingToken.safeTransfer(msg.sender, amount);
        }
    }

    function pause() external onlyGuard {
        require(!paused, "Contract already paused.");
        paused = true;
        emit Pause();
    }

    function unpause() external onlyGuard {
        require(paused, "Contract not paused.");
        paused = false;
        emit Unpause();
    }

    function setGuard(address _newGuard) external onlyGuard {
        require(_newGuard != address(0), "Zero guard.");
        guard = _newGuard;
    }

    function _claimOne(address user, uint256 id) internal {
        RewardStream storage stream = _requireStream(id);
        _settleUserStream(user, id);

        RewardPosition storage position = rewardPositions[user][id];
        uint256 userRewards = position.rewardsOwed;
        require(userRewards > 0, "No rewards.");

        uint256 replenished = (userRewards / 100) * stream.replenishTax;
        uint256 estimatedRewards = userRewards - replenished;
        uint256 rewards = estimatedRewards / DIVISOR;
        uint256 replenish = replenished / DIVISOR;
        uint256 spentRewards = rewards + replenish;

        position.rewardsOwed = 0;
        stream.allRewardsOwed -= spentRewards;
        position.totalClaimed += rewards;
        stream.totalClaimedRewards += rewards;
        stream.currentReplenish += replenish;
        stream.totalReplenish += replenish;

        if (rewards > 0) stream.payToken.safeTransfer(user, rewards);
        if (replenish > 0) stream.payToken.safeTransfer(treasury, replenish);

        _setRewards(id);
        emit RewardClaimedByUser(user, id, rewards);
    }

    function _settleUserAll(address user) internal {
        for (uint256 id = 1; id <= rewardStreamCount; id++) {
            _settleUserStream(user, id);
        }
    }

    function _settleUserStream(address user, uint256 id) internal {
        RewardStream storage stream = _requireStream(id);
        _updateStream(id);

        RewardPosition storage position = rewardPositions[user][id];
        if (blacklist[user]) {
            position.rewardsOwed = 0;
            position.checkpoint = stream.accumulator;
            return;
        }

        uint256 delta = stream.accumulator - position.checkpoint;
        if (delta > 0 && stakes[user].amount > 0) {
            uint256 accrued = stakes[user].amount * delta;
            position.rewardsOwed += accrued;
            stream.allRewardsOwed += accrued / DIVISOR;
        }
        position.checkpoint = stream.accumulator;
    }

    function _updateAllStreams() internal {
        for (uint256 id = 1; id <= rewardStreamCount; id++) _updateStream(id);
    }

    function _updateStream(uint256 id) internal {
        RewardStream storage stream = _requireStream(id);
        if (block.timestamp <= stream.lastUpdate) return;
        if (stream.active && totalStaked > 0) {
            stream.accumulator += (block.timestamp - stream.lastUpdate) * stream.rewardPerStamp;
        }
        stream.lastUpdate = block.timestamp;
    }

    function _syncUserCheckpoints(address user) internal {
        for (uint256 id = 1; id <= rewardStreamCount; id++) {
            rewardPositions[user][id].checkpoint = rewardStreams[id].accumulator;
        }
    }

    function _setRewardsAll() internal {
        for (uint256 id = 1; id <= rewardStreamCount; id++) _setRewards(id);
    }

    function _setRewards(uint256 id) internal {
        RewardStream storage stream = _requireStream(id);
        uint256 contractBalance = stream.payToken.balanceOf(address(this));
        if (contractBalance > stream.allRewardsOwed) stream.totalRewards = contractBalance - stream.allRewardsOwed;
        else stream.totalRewards = 0;

        if (totalStaked > 0 && Duration > 0) stream.rewardPerStamp = (stream.totalRewards * DIVISOR) / (totalStaked * Duration);
        else stream.rewardPerStamp = 0;

        emit RewardsUpdated(id, stream.totalRewards, stream.rewardPerStamp);
    }

    function _requireStream(uint256 id) internal view returns (RewardStream storage stream) {
        stream = rewardStreams[id];
        require(stream.exists, "Unknown stream.");
    }
}
