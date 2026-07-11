// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

/// @notice Minimal ERC20 interface used by Penny4ThotsHarvesterV2.
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Minimal safe-transfer helpers that accept standard ERC20 bool returns.
library SafeERC20Lite {
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        require(token.transfer(to, amount), "TRANSFER_FAILED");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        require(token.transferFrom(from, to, amount), "TRANSFER_FROM_FAILED");
    }
}

/// @notice Small non-reentrancy guard to keep this contract self-contained.
abstract contract ReentrancyGuardLite {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANT_CALL");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/// @title Penny4Thots Harvester V2
/// @notice Multi-reward staking engine inspired by the Battledogs Harvester lazy-accounting model.
/// @dev A single staking balance powers independent reward streams indexed through mappings.
contract Penny4ThotsHarvesterV2 is ReentrancyGuardLite {
    using SafeERC20Lite for IERC20;

    uint256 public constant ACCUMULATOR_PRECISION = 1e36;

    address public owner;
    address public guard;
    IERC20 public immutable stakingToken;

    bool public paused;
    uint256 public totalStaked;
    uint256 public activeParticipantCount;
    uint256 public participantCount;
    uint256 public rewardStreamCount;
    uint256 public defaultRewardDuration = 7 days;
    uint256 public timeLock = 7 days;

    struct StakePosition {
        uint256 amount;
        uint256 enteredAt;
    }

    struct RewardStream {
        IERC20 token;
        bool exists;
        bool active;
        uint256 rewardRate;
        uint256 periodFinish;
        uint256 lastUpdate;
        uint256 accumulator;
        uint256 duration;
        uint256 fundedRewards;
        uint256 distributedRewards;
        uint256 claimedRewards;
        uint256 remainingRewards;
    }

    struct RewardPosition {
        uint256 checkpoint;
        uint256 pending;
        uint256 claimed;
    }

    mapping(address => StakePosition) public stakes;
    mapping(uint256 => RewardStream) public rewardStreams;
    mapping(address => mapping(uint256 => RewardPosition)) public rewardPositions;
    mapping(address => bool) public blacklist;
    mapping(address => bool) public activeStake;
    mapping(address => uint256) public participantIndex;
    mapping(uint256 => address) public participants;

    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event GuardUpdated(address indexed oldGuard, address indexed newGuard);
    event Paused(address indexed guard);
    event Unpaused(address indexed guard);
    event RewardStreamCreated(uint256 indexed streamId, address indexed rewardToken, uint256 duration);
    event RewardStreamStatusUpdated(uint256 indexed streamId, bool active);
    event RewardsDeposited(uint256 indexed streamId, address indexed funder, uint256 amount, uint256 rewardRate, uint256 periodFinish);
    event StreamAdvanced(uint256 indexed streamId, uint256 emittedReward, uint256 accumulator);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed streamId, address indexed rewardToken, uint256 amount);
    event BlacklistUpdated(address indexed user, bool blocked);
    event DefaultRewardDurationUpdated(uint256 duration);
    event TimeLockUpdated(uint256 duration);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyGuard() {
        require(msg.sender == guard, "NOT_GUARD");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    constructor(address _stakingToken, address _guard) {
        require(_stakingToken != address(0), "ZERO_STAKING_TOKEN");
        require(_guard != address(0), "ZERO_GUARD");
        owner = msg.sender;
        guard = _guard;
        stakingToken = IERC20(_stakingToken);
        emit OwnershipTransferred(address(0), msg.sender);
        emit GuardUpdated(address(0), _guard);
    }

    function createRewardStream(address rewardToken, uint256 duration) external onlyOwner returns (uint256 streamId) {
        require(rewardToken != address(0), "ZERO_REWARD_TOKEN");
        if (duration == 0) {
            duration = defaultRewardDuration;
        }
        streamId = rewardStreamCount;
        rewardStreams[streamId] = RewardStream({
            token: IERC20(rewardToken),
            exists: true,
            active: true,
            rewardRate: 0,
            periodFinish: block.timestamp,
            lastUpdate: block.timestamp,
            accumulator: 0,
            duration: duration,
            fundedRewards: 0,
            distributedRewards: 0,
            claimedRewards: 0,
            remainingRewards: 0
        });
        rewardStreamCount = streamId + 1;
        emit RewardStreamCreated(streamId, rewardToken, duration);
    }

    function depositRewards(uint256 streamId, uint256 amount) external nonReentrant onlyOwner {
        require(amount > 0, "ZERO_AMOUNT");
        RewardStream storage stream = _existingStream(streamId);
        _advanceStream(streamId);
        stream.token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 newRewardBalance = stream.remainingRewards + amount;
        stream.rewardRate = newRewardBalance / stream.duration;
        require(stream.rewardRate > 0, "AMOUNT_TOO_SMALL");
        stream.periodFinish = block.timestamp + stream.duration;
        stream.lastUpdate = block.timestamp;
        stream.fundedRewards += amount;
        stream.remainingRewards = newRewardBalance;

        emit RewardsDeposited(streamId, msg.sender, amount, stream.rewardRate, stream.periodFinish);
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "ZERO_AMOUNT");
        require(!blacklist[msg.sender], "BLACKLISTED");
        _settleAll(msg.sender);
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        StakePosition storage position = stakes[msg.sender];
        if (position.amount == 0) {
            activeParticipantCount += 1;
            activeStake[msg.sender] = true;
            if (participantIndex[msg.sender] == 0) {
                participantCount += 1;
                participants[participantCount] = msg.sender;
                participantIndex[msg.sender] = participantCount;
            }
        }
        position.amount += amount;
        position.enteredAt = block.timestamp;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakePosition storage position = stakes[msg.sender];
        require(amount > 0 && amount <= position.amount, "INVALID_AMOUNT");
        require(position.enteredAt + timeLock <= block.timestamp, "TIMELOCKED");
        _settleAll(msg.sender);

        position.amount -= amount;
        totalStaked -= amount;
        if (position.amount == 0 && activeStake[msg.sender]) {
            activeStake[msg.sender] = false;
            activeParticipantCount -= 1;
        }
        stakingToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claim(uint256[] calldata streamIds) external nonReentrant whenNotPaused {
        require(!blacklist[msg.sender], "BLACKLISTED");
        require(streamIds.length > 0, "NO_STREAMS");
        for (uint256 i; i < streamIds.length; i++) {
            uint256 streamId = streamIds[i];
            _settleStreamForUser(msg.sender, streamId);
            RewardPosition storage position = rewardPositions[msg.sender][streamId];
            uint256 amount = position.pending;
            require(amount > 0, "NO_REWARDS");
            position.pending = 0;
            position.claimed += amount;
            RewardStream storage stream = rewardStreams[streamId];
            stream.claimedRewards += amount;
            stream.token.safeTransfer(msg.sender, amount);
            emit RewardClaimed(msg.sender, streamId, address(stream.token), amount);
        }
    }

    function earned(address user, uint256 streamId) external view returns (uint256) {
        RewardStream storage stream = rewardStreams[streamId];
        require(stream.exists, "STREAM_NOT_FOUND");
        RewardPosition storage position = rewardPositions[user][streamId];
        uint256 accumulator = stream.accumulator;
        uint256 applicableTime = block.timestamp < stream.periodFinish ? block.timestamp : stream.periodFinish;
        if (stream.active && totalStaked > 0 && applicableTime > stream.lastUpdate) {
            uint256 emittedReward = (applicableTime - stream.lastUpdate) * stream.rewardRate;
            accumulator += (emittedReward * ACCUMULATOR_PRECISION) / totalStaked;
        }
        return position.pending + ((stakes[user].amount * (accumulator - position.checkpoint)) / ACCUMULATOR_PRECISION);
    }

    function setRewardStreamActive(uint256 streamId, bool active) external onlyOwner {
        RewardStream storage stream = _existingStream(streamId);
        _advanceStream(streamId);
        stream.active = active;
        emit RewardStreamStatusUpdated(streamId, active);
    }

    function setDefaultRewardDuration(uint256 duration) external onlyOwner {
        require(duration > 0, "ZERO_DURATION");
        defaultRewardDuration = duration;
        emit DefaultRewardDurationUpdated(duration);
    }

    function setStreamDuration(uint256 streamId, uint256 duration) external onlyOwner {
        require(duration > 0, "ZERO_DURATION");
        RewardStream storage stream = _existingStream(streamId);
        require(block.timestamp >= stream.periodFinish, "ACTIVE_EMISSION");
        stream.duration = duration;
    }

    function setTimeLock(uint256 duration) external onlyOwner {
        timeLock = duration;
        emit TimeLockUpdated(duration);
    }

    function setBlacklist(address user, bool blocked) external onlyOwner {
        blacklist[user] = blocked;
        emit BlacklistUpdated(user, blocked);
    }

    function pause() external onlyGuard {
        require(!paused, "ALREADY_PAUSED");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyGuard {
        require(paused, "NOT_PAUSED");
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setGuard(address newGuard) external onlyGuard {
        require(newGuard != address(0), "ZERO_GUARD");
        emit GuardUpdated(guard, newGuard);
        guard = newGuard;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_OWNER");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _settleAll(address user) internal {
        for (uint256 streamId; streamId < rewardStreamCount; streamId++) {
            _settleStreamForUser(user, streamId);
        }
    }

    function _settleStreamForUser(address user, uint256 streamId) internal {
        RewardStream storage stream = _existingStream(streamId);
        _advanceStream(streamId);
        RewardPosition storage position = rewardPositions[user][streamId];
        uint256 delta = stream.accumulator - position.checkpoint;
        if (delta > 0) {
            position.pending += (stakes[user].amount * delta) / ACCUMULATOR_PRECISION;
        }
        position.checkpoint = stream.accumulator;
    }

    function _advanceStream(uint256 streamId) internal {
        RewardStream storage stream = _existingStream(streamId);
        uint256 applicableTime = block.timestamp < stream.periodFinish ? block.timestamp : stream.periodFinish;
        if (applicableTime <= stream.lastUpdate) {
            return;
        }

        if (!stream.active || totalStaked == 0) {
            stream.lastUpdate = applicableTime;
            return;
        }

        uint256 emittedReward = (applicableTime - stream.lastUpdate) * stream.rewardRate;
        if (emittedReward > stream.remainingRewards) {
            emittedReward = stream.remainingRewards;
        }
        stream.accumulator += (emittedReward * ACCUMULATOR_PRECISION) / totalStaked;
        stream.distributedRewards += emittedReward;
        stream.remainingRewards -= emittedReward;
        stream.lastUpdate = applicableTime;
        emit StreamAdvanced(streamId, emittedReward, stream.accumulator);
    }

    function _existingStream(uint256 streamId) internal view returns (RewardStream storage stream) {
        stream = rewardStreams[streamId];
        require(stream.exists, "STREAM_NOT_FOUND");
    }
}
