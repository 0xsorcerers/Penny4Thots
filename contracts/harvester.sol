// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/ReentrancyGuard.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/IERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Harvester
 * @notice GAME staking rewards contract expanded to support many independent pay tokens.
 * @dev The original Harvester tracked one `payToken` and used era loops to calculate rewards. This version
 *      stores every supported pay token behind a numeric id, uses per-token reward accumulators, and lets callers
 *      settle only the token ids they pass to `getClaims`. There are no contract-wide loops over users, positions,
 *      tokens, or eras; every loop is bounded by calldata supplied by the caller or developer.
 */
contract Harvester is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Fixed-point precision used by accumulator math so small rewards are not rounded away early.
    uint256 public constant ACC_PRECISION = 1e18;

    /// @notice Upper bound for id arrays accepted by read/claim helper functions to protect callers from accidental out-of-gas batches.
    uint256 public constant MAX_BATCH_SIZE = 100;

    /// @notice Staked token that earns all registered pay-token reward streams.
    IERC20 public GAMEToken;

    /// @notice Address that receives the optional replenish slice of each claim.
    address public battledogs;

    /// @notice Emergency operator that can pause and unpause without receiving full owner privileges.
    address public guard;

    /// @notice Total GAME principal currently staked by all participants; seeded at one unit to avoid division by zero before first stake.
    uint256 public TotalGAMESent = 1;

    /// @notice Number of addresses with a non-zero GAME stake, maintained without iterating through stakers.
    uint256 public numberOfParticipants;

    /// @notice Seconds a user must wait after staking before withdrawing GAME.
    uint256 public timeLock = 604800;

    /// @notice Percent tax charged on new GAME stakes and retained as GAME inside this contract.
    uint256 public tax;

    /// @notice Total GAME tax reserves available for owner withdrawal.
    uint256 public TaxTotal;

    /// @notice Percent of each pay-token claim redirected to `battledogs` when replenishment is active.
    uint256 public replenishTax;

    /// @notice Aggregate replenishment sent during the current replenishment window across all pay tokens.
    uint256 public currentReplenish;

    /// @notice Lifetime aggregate replenishment sent across all pay tokens.
    uint256 public totalReplenish;

    /// @notice True while user staking, withdrawal, and reward claims are paused by the guard.
    bool public paused;

    /// @notice True when `replenishTax` should be considered intentionally enabled.
    bool public replenisher;

    /// @notice GAME stake balance per user; this is shared across all pay-token reward streams.
    mapping(address => uint256) public balances;

    /// @notice Last GAME stake timestamp per user, used by `onlyAfterTimelock` for withdrawals.
    mapping(address => uint256) public entryMap;

    /// @notice Last successful reward claim timestamp per user, used by `onlyClaimant` for reward claims.
    mapping(address => uint256) public UserClaims;

    /// @notice User blacklist; blacklisted users cannot stake or claim until removed.
    mapping(address => bool) public blacklist;

    /// @notice Lifetime claimed rewards per user per pay-token address, kept segregated for analytics and audits.
    mapping(address => mapping(address => uint256)) public Claimants;

    /// @notice Total claimed rewards per pay-token address, never mixed with other reward currencies.
    mapping(address => uint256) public totalClaimedRewards;

    /// @notice Number of token positions registered in `payTokens`; ids are valid in the range `[0, positionCount)`.
    uint256 public positionCount;

    /// @notice Numeric pay-token position id to ERC20 token address; replaces a single global `payToken`.
    mapping(uint256 => address) public payTokens;

    /// @notice ERC20 token address to numeric position id plus one; zero means the token has not been registered.
    mapping(address => uint256) public payTokenIndexPlusOne;

    /// @notice Per-token reward accounting state; all values are segregated by pay-token id.
    struct RewardStream {
        /// @notice Last contract balance observed after owed rewards were reserved for this token.
        uint256 accountedBalance;
        /// @notice Rewards earned per staked GAME, scaled by `ACC_PRECISION`, for this token only.
        uint256 rewardPerTokenStored;
        /// @notice Rewards owed but not yet paid for this token, reserving balance against double-spend.
        uint256 rewardsOwed;
        /// @notice Total rewards made available to stakers for this token over the lifetime of the stream.
        uint256 totalRewards;
    }

    /// @notice Pay-token id to its independent reward stream state.
    mapping(uint256 => RewardStream) public rewardStreams;

    /// @notice User and token specific checkpoint used to calculate only that user's rewards for only that token.
    struct UserReward {
        /// @notice User's last observed `rewardPerTokenStored` for this pay-token stream.
        uint256 paidPerToken;
        /// @notice Accrued raw token rewards owed to the user for this stream.
        uint256 rewards;
    }

    /// @notice user => pay-token id => user-specific reward accounting; prevents reward computations from crossing token streams.
    mapping(address => mapping(uint256 => UserReward)) public userRewards;

    event PayTokenAdded(uint256 indexed tokenId, address indexed token);
    event RewardsUpdated(uint256 indexed tokenId, address indexed token, uint256 newlyAvailable, uint256 totalRewards);
    event RewardAddedByDev(uint256 indexed tokenId, address indexed token, uint256 amount);
    event RewardClaimedByUser(address indexed user, uint256 indexed tokenId, address indexed token, uint256 amount, uint256 replenished);
    event AddGAME(address indexed user, uint256 amount);
    event WithdrawGAME(address indexed user, uint256 amount);
    event Pause();
    event Unpause();
    event ReplenishOn();
    event ReplenishOff();

    constructor(address _GAMEToken, address _battledogs, address _newGuard, address[] memory _payTokens) Ownable(msg.sender) {
        require(_GAMEToken != address(0) && _battledogs != address(0) && _newGuard != address(0), "Zero address");
        GAMEToken = IERC20(_GAMEToken);
        battledogs = _battledogs;
        guard = _newGuard;
        for (uint256 i; i < _payTokens.length; i++) {
            _addPayToken(_payTokens[i]);
        }
    }

    modifier onlyGuard() {
        require(msg.sender == guard, "Not authorized.");
        _;
    }

    modifier onlyAfterTimelock() {
        require(entryMap[msg.sender] + timeLock < block.timestamp, "Timelocked.");
        _;
    }

    modifier onlyClaimant() {
        require(UserClaims[msg.sender] + timeLock < block.timestamp, "Timelocked.");
        _;
    }

    function addPayToken(address _payToken) external onlyOwner returns (uint256 tokenId) {
        tokenId = _addPayToken(_payToken);
    }

    function _addPayToken(address _payToken) internal returns (uint256 tokenId) {
        require(_payToken != address(0), "Zero token");
        require(payTokenIndexPlusOne[_payToken] == 0, "Token exists");
        tokenId = positionCount++;
        payTokens[tokenId] = _payToken;
        payTokenIndexPlusOne[_payToken] = tokenId + 1;
        emit PayTokenAdded(tokenId, _payToken);
    }

    function readPayTokens(uint256 startId, uint256 count) external view returns (address[] memory tokens) {
        require(count <= MAX_BATCH_SIZE, "Batch too large");
        require(startId + count <= positionCount, "Range out of bounds");
        tokens = new address[](count);
        for (uint256 i; i < count; i++) tokens[i] = payTokens[startId + i];
    }

    function addGAME(uint256 _amount, uint256[] calldata _tokenIds) external nonReentrant {
        require(!paused && _amount > 0 && !blacklist[msg.sender], "Call reverted");
        _syncUser(msg.sender, _tokenIds);
        GAMEToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 toll = (_amount * tax) / 100;
        uint256 amount = _amount - toll;
        TaxTotal += toll;
        if (balances[msg.sender] == 0) numberOfParticipants += 1;
        balances[msg.sender] += amount;
        TotalGAMESent += amount;
        entryMap[msg.sender] = block.timestamp;
        emit AddGAME(msg.sender, _amount);
    }

    function withdrawGAME(uint256[] calldata _tokenIds) external nonReentrant onlyAfterTimelock {
        require(!paused && balances[msg.sender] > 0, "Call reverted");
        _syncUser(msg.sender, _tokenIds);
        uint256 GAMEAmount = balances[msg.sender];
        balances[msg.sender] = 0;
        TotalGAMESent -= GAMEAmount;
        numberOfParticipants -= 1;
        entryMap[msg.sender] = 0;
        GAMEToken.safeTransfer(msg.sender, GAMEAmount);
        emit WithdrawGAME(msg.sender, GAMEAmount);
    }

    function addRewards(uint256 _tokenId, uint256 _amount) external onlyOwner {
        address token = _requirePayToken(_tokenId);
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        _syncRewards(_tokenId);
        emit RewardAddedByDev(_tokenId, token, _amount);
    }

    function resetRewards(uint256[] calldata _tokenIds) external onlyOwner {
        _syncStreams(_tokenIds);
    }

    function getClaims(uint256[] calldata _tokenIds) external nonReentrant onlyClaimant {
        require(!paused && !blacklist[msg.sender], "Call reverted");
        _syncUser(msg.sender, _tokenIds);
        for (uint256 i; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            address token = _requirePayToken(tokenId);
            UserReward storage user = userRewards[msg.sender][tokenId];
            uint256 userRewardsDue = user.rewards;
            require(userRewardsDue > 0, "No rewards");
            user.rewards = 0;
            uint256 replenished = (userRewardsDue * replenishTax) / 100;
            uint256 rewards = userRewardsDue - replenished;
            RewardStream storage stream = rewardStreams[tokenId];
            stream.rewardsOwed -= userRewardsDue;
            totalClaimedRewards[token] += rewards;
            Claimants[msg.sender][token] += rewards;
            currentReplenish += replenished;
            totalReplenish += replenished;
            IERC20(token).safeTransfer(msg.sender, rewards);
            if (replenished > 0) IERC20(token).safeTransfer(battledogs, replenished);
            stream.accountedBalance = IERC20(token).balanceOf(address(this));
            emit RewardClaimedByUser(msg.sender, tokenId, token, rewards, replenished);
        }
        UserClaims[msg.sender] = block.timestamp;
    }

    function earned(address account, uint256 tokenId) public view returns (uint256) {
        _requirePayToken(tokenId);
        RewardStream storage stream = rewardStreams[tokenId];
        return userRewards[account][tokenId].rewards + ((balances[account] * (stream.rewardPerTokenStored - userRewards[account][tokenId].paidPerToken)) / ACC_PRECISION);
    }

    function _syncUser(address account, uint256[] calldata _tokenIds) internal {
        require(_tokenIds.length > 0 && _tokenIds.length <= MAX_BATCH_SIZE, "Invalid batch");
        for (uint256 i; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            _syncRewards(tokenId);
            UserReward storage user = userRewards[account][tokenId];
            uint256 accrued = (balances[account] * (rewardStreams[tokenId].rewardPerTokenStored - user.paidPerToken)) / ACC_PRECISION;
            if (accrued > 0) {
                user.rewards += accrued;
                rewardStreams[tokenId].rewardsOwed += accrued;
            }
            user.paidPerToken = rewardStreams[tokenId].rewardPerTokenStored;
        }
    }

    function _syncStreams(uint256[] calldata _tokenIds) internal {
        require(_tokenIds.length > 0 && _tokenIds.length <= MAX_BATCH_SIZE, "Invalid batch");
        for (uint256 i; i < _tokenIds.length; i++) _syncRewards(_tokenIds[i]);
    }

    function _syncRewards(uint256 tokenId) internal {
        address token = _requirePayToken(tokenId);
        RewardStream storage stream = rewardStreams[tokenId];
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 reserved = stream.rewardsOwed;
        uint256 available = balance > reserved ? balance - reserved : 0;
        if (available > stream.accountedBalance && TotalGAMESent > 0) {
            uint256 newlyAvailable = available - stream.accountedBalance;
            stream.totalRewards += newlyAvailable;
            stream.rewardPerTokenStored += (newlyAvailable * ACC_PRECISION) / TotalGAMESent;
            emit RewardsUpdated(tokenId, token, newlyAvailable, stream.totalRewards);
        }
        stream.accountedBalance = available;
    }

    function _requirePayToken(uint256 tokenId) internal view returns (address token) {
        token = payTokens[tokenId];
        require(token != address(0) && tokenId < positionCount, "Unknown token");
    }

    function withdraw(uint256 _tokenId, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero.");
        if (_tokenId == type(uint256).max) {
            require(amount <= TaxTotal, "Max Exceeded.");
            TaxTotal -= amount;
            GAMEToken.safeTransfer(msg.sender, amount);
        } else {
            address token = _requirePayToken(_tokenId);
            _syncRewards(_tokenId);
            RewardStream storage stream = rewardStreams[_tokenId];
            uint256 balance = IERC20(token).balanceOf(address(this));
            require(balance > stream.rewardsOwed && amount <= balance - stream.rewardsOwed, "Not Enough Reserves.");
            IERC20(token).safeTransfer(msg.sender, amount);
            stream.accountedBalance = IERC20(token).balanceOf(address(this)) - stream.rewardsOwed;
        }
    }

    function setTimeLock(uint256 _seconds) external onlyOwner { timeLock = _seconds; }
    function setTaxes(uint256 _stakeTax, uint256 _replenishTax) external onlyOwner { tax = _stakeTax; replenishTax = _replenishTax; }
    function setGAMEToken(address _GAMEToken) external onlyOwner { require(_GAMEToken != address(0), "Zero address"); GAMEToken = IERC20(_GAMEToken); }
    function setBattledogs(address _battledogs) external onlyOwner { require(_battledogs != address(0), "Zero address"); battledogs = _battledogs; }
    function setGuard(address _newGuard) external onlyGuard { require(_newGuard != address(0), "Zero address"); guard = _newGuard; }

    function addToBlacklist(address[] calldata _addresses) external onlyOwner { for (uint256 i; i < _addresses.length; i++) blacklist[_addresses[i]] = true; }
    function removeFromBlacklist(address[] calldata _addresses) external onlyOwner { for (uint256 i; i < _addresses.length; i++) blacklist[_addresses[i]] = false; }
    function pause() external onlyGuard { require(!paused, "Contract already paused."); paused = true; emit Pause(); }
    function unpause() external onlyGuard { require(paused, "Contract not paused."); paused = false; emit Unpause(); }
    function replenishOn(uint256 _replenishTax) external onlyOwner { require(!replenisher, "Replenish already turned on."); replenisher = true; replenishTax = _replenishTax; emit ReplenishOn(); }
    function replenishOff() external onlyOwner { require(replenisher, "Replenish is not in progress."); replenishTax = 0; currentReplenish = 0; replenisher = false; emit ReplenishOff(); }
}
