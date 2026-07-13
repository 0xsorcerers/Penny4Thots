// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;
//Title A GameFi-Integrated Decentralized Multi-token Harvester contract
//Co-Developed and enhanced using Gemini Pro


import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/ReentrancyGuard.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/IERC20.sol";

// ==========================================
// EXTERNAL INTERFACES
// ==========================================

/**
 * @title IProofOfAccess
 * @dev Interface to communicate with your external Proof_of_Access NFT contract.
 * We define the Player struct here exactly as it exists in the target contract 
 * so our Harvester knows how to unpack the returned data.
 */
interface IProofOfAccess {
    struct Player {
        string TIER;
        uint256 ID;
        uint256 LISTS;
        bool BLACKLIST;
    }

    // Expects a function in Proof_of_Access that returns the struct for a specific wallet
    function getPlayer(address _user, uint256 _nft) external view returns (uint256);
}

/**
 * @title Harvester
 * @dev Expanded Multi-Token Harvester Contract with User-Subscribed Reward Tiers
 */
contract Harvester is Ownable, ReentrancyGuard {
    /**
     * @notice  Initializes the Harvester contract with GAME token, penny address, guard, and initial pay tokens.
     * @dev     Sets up the contract with the staked GAME token, recipient for replenishment, emergency guard, and registers all provided pay tokens.
     * @param   _GAMEToken Address of the GAME token that users stake.
     * @param   _developAddress Address of the develop fund.
     * @param   _newGuard Address of the emergency operator that can pause/unpause.
     */
    constructor(address _GAMEToken, address _developAddress, address _newGuard) Ownable(msg.sender){
        GAMEToken = IERC20(_GAMEToken);
        developAddress = _developAddress;
        guard = _newGuard;
        startTime = block.timestamp;
        eraClock = startTime;
    }

    IERC20 public GAMEToken;
    IProofOfAccess public proofOfAccess; // Reference to your NFT contract

    // --- DECENTRALIZED TOKEN ARCHITECTURE ---
    
    uint256 public MAX_BATCH_SIZE = 50;

    // Maps a user to a list of tokens they've hand-picked to receive rewards from
    mapping(address => mapping(uint256 => address)) public activeTokenListByUser;

    // Tracks how many tokens a user is currently subscribed to
    mapping(address => uint256) public activeTokenListByUserCount;

    // O(1) lookup to check if a user is already subscribed to a specific token address
    mapping(address => mapping(address => bool)) public isSubscribed;

    // Tracks the total amount of GAME actively staked toward a specific reward token.
    // Crucial for decentralized math: If only 2 people subscribe to WBTC, we only divide 
    // the WBTC rewards by their combined stake, not the whole protocol's stake.
    mapping(address => uint256) public tokenTotalStaked;

    // --- GLOBAL ECONOMIC STATE PER TOKEN ---
    struct TokenEconomy {
        uint256 totalRewards;
        uint256 allRewardsOwed;
        uint256 rewardPerStamp;
        uint256 currentERA; // Local time-tracker for this specific token
        uint256 startTime;  // When this token was initialized
        bool isAdded;       // Verifies the token is active
    }
    mapping(address => TokenEconomy) public tokenEconomics;
    
    // The historical rate ledger: tokenAddress -> ERA -> rewardPerStamp
    mapping(address => mapping(uint256 => uint256)) public eraRewards;

    // --- BATCH SYNC STATE MACHINE ---
    // Protects the contract from unbounded gas limits if a whale has 50+ subscriptions
    struct SyncState {
        uint256 syncedUpTo; // The index of the last token we calculated rewards for
        bool isSyncing;     // Lock: Prevents user from changing subscriptions mid-sync
        bool syncComplete;  // Lock: Prevents depositing/withdrawing until all math is updated
    }
    mapping(address => SyncState) public userSyncStates;

    // --- GLOBAL STAKING VARIABLES ---
    uint256 public eralength = 86400;
    uint256 public immutable startTime;
    uint256 public numberOfParticipants = 0;
    uint256 public Duration = 86400;
    uint256 public timeLock = 86400;
    uint256 public TotalGAMESent = 1; 
    uint256 public tax = 0;
    uint256 public TaxTotal = 0;
    uint256 public developTax = 0;
    uint256 public ERA = 0;
    uint256 public eraClock;
    uint256 public liveDays;
    uint256 private divisor = 100 ether;
    address private guard;
    address public developAddress;
    bool public paused = false;   

    // --- USER STATE ---
    mapping(address => uint256) public balances;
    mapping(address => uint256) public entryMap;
    mapping(address => uint256) public UserClaims;
    mapping(address => bool) public blacklist;

    // The isolated user data for a SPECIFIC token
    struct Claim {
        uint256 eraAtBlock; // The ERA timestamp when the user last synced this token
        uint256 rewardsOwed; // The static bucket where we dump their calculated rewards
        uint256 GAMESent; // Their staked GAME snapshot specifically for this token
    }
    
    // User -> payTokenAddress -> Claim State
    mapping(address => mapping(address => Claim)) public claimRewards;
    mapping(address => mapping(address => uint256)) public Claimants;

    // --- EVENTS ---
    event TokenSubscribed(address indexed user, uint256 currentCount, uint256 maxAllowed);
    event SyncProgress(address indexed user, bool done, uint256 remaining);
    event RewardClaimedByUser(address indexed user, address indexed token, uint256 amount);
    event AddGAME(address indexed user, uint256 amount);
    event WithdrawGAME(address indexed user, uint256 amount);

    modifier onlyGuard() {
        require(msg.sender == guard, "Not authorized.");
        _;
    }

    modifier onlyAfterTimelock() {             
        require(entryMap[msg.sender] + timeLock < block.timestamp, "Timelocked.");
        _;
    }

    /// @notice Ensures the caller has waited the required timelock period since their last claim.
    modifier onlyClaimant() {
        require(UserClaims[msg.sender] + timeLock < block.timestamp, "Timelocked.");
        _;
    }

    // ==========================================
    // EXTERNAL CONTRACT CONFIGURATION
    // ==========================================

    /**
     * @notice Links the Harvester to the Proof_of_Access NFT collection.
     * @dev Called by the admin to point the interface to the live NFT contract address.
     */
    function setProofOfAccessContract(address _proofOfAccessAddress) external onlyGuard {
        proofOfAccess = IProofOfAccess(_proofOfAccessAddress);
    }

    // ==========================================
    // DYNAMIC TIER LIMITS
    // ==========================================

    /**
     * @notice Calculates a user's maximum allowed token subscriptions.
     * @dev Interrogates the Proof_of_Access contract. If the user owns the NFT, 
     * their max limit is derived from their struct (ID + LISTS). 
     * If they don't own it, or the call fails, they default to 1.
     * @param _user The address of the staker.
     * @return The integer limit of how many tokens they can subscribe to.
     */
    function getMaxSubscriptions(address _user, uint256 _nft) internal view returns (uint256) {
        // Fallback if we haven't linked the NFT contract yet
        if (address(proofOfAccess) == address(0)) {
            return 1; 
        }

        // We use try/catch so that if the user doesn't own an NFT and the NFT 
        // contract throws an error, our contract doesn't crash. It just gracefully returns 1.
        uint256 limit = proofOfAccess.getPlayer(_user, _nft);
        return limit;
    }

// ==========================================
    // DYNAMIC SUBSCRIPTION MANAGEMENT
    // ==========================================

    /**
     * @notice Completely replaces a user's reward token subscription list.
     * @dev Automatically settles outstanding rewards on old tokens, unsubscribes them, 
     * and routes the user's active GAME stake into the newly requested tokens.
     * @param _newTokens Array of token addresses the user wants to subscribe to.
     */
    function subscribeToToken(address[] calldata _newTokens, uint256 _nft) external nonReentrant {
        require(!paused, "Contract is paused.");
        require(!blacklist[msg.sender], "Address is blacklisted.");

        // --- TIER VALIDATION ---
        uint256 maxAllowed = getMaxSubscriptions(msg.sender, _nft);
        require(_newTokens.length <= maxAllowed, "Exceeds Proof_of_Access tier limit");
        require(_newTokens.length <= MAX_BATCH_SIZE, "Exceeds absolute batch limit");

        uint256 currentCount = activeTokenListByUserCount[msg.sender];
        uint256 userStake = balances[msg.sender];

        // 1. SETTLE AND CLEANUP OLD SUBSCRIPTIONS
        // We iterate through their existing list to secure their yields before disconnecting them.
        for (uint256 i = 0; i < currentCount; i++) {
            address oldToken = activeTokenListByUser[msg.sender][i];
            
            // Settle historical yields and dump them securely into `rewardsOwed`
            _processSingleTokenClaim(msg.sender, oldToken);
            
            // Remove the user's active weight from this token's decentralized economy
            if (userStake > 0) {
                tokenTotalStaked[oldToken] -= claimRewards[msg.sender][oldToken].GAMESent;
            }
            
            // Zero out their active stake snapshot for this token
            claimRewards[msg.sender][oldToken].GAMESent = 0;
            isSubscribed[msg.sender][oldToken] = false;
            
            // Recalculate the token's economy now that this user's stake has left
            _setRewards(oldToken); 
        }

        // 2. SETUP NEW SUBSCRIPTIONS
        for (uint256 i = 0; i < _newTokens.length; i++) {
            address newToken = _newTokens[i];
            
            // Prevent users from accidentally putting the same token twice in their array payload
            require(!isSubscribed[msg.sender][newToken], "Duplicate token in array");

            // Write the new token to their list
            activeTokenListByUser[msg.sender][i] = newToken;
            isSubscribed[msg.sender][newToken] = true;

            // Initialize their internal clock for this specific token to its current local clock
            claimRewards[msg.sender][newToken].eraAtBlock = tokenEconomics[newToken].currentERA;

            // Instantly route their global staked GAME into this new token's economy
            if (userStake > 0) {
                tokenTotalStaked[newToken] += userStake;
                claimRewards[msg.sender][newToken].GAMESent = userStake;
            }
            
            // Recalculate the token's economy now that this user's stake has arrived
            _setRewards(newToken);
        }

        // 3. FINALIZE STATE
        activeTokenListByUserCount[msg.sender] = _newTokens.length;

        emit TokenSubscribed(msg.sender, _newTokens.length, maxAllowed);
    }

    /**
     * @notice Helper function to retrieve all currently subscribed tokens for a user.
     * @dev Necessary for the frontend UI to display active streams or populate management modals.
     * @param _user The address of the staker.
     * @return An array of token addresses.
     */
    function getUserSubscriptions(address _user) external view returns (address[] memory) {
        uint256 count = activeTokenListByUserCount[_user];
        address[] memory subs = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            subs[i] = activeTokenListByUser[_user][i];
        }
        
        return subs;
    }

    // ==========================================
    // BATCH STATE MACHINE (Gas Protection)
    // ==========================================

    /**
     * @notice Processes historical rewards in chunks. Prevents OOG (Out of Gas) errors.
     * @dev Users with large limits (e.g., 100 max subscriptions) must call this until done == true 
     * before they can deposit or withdraw.
     */
    function syncUserTokens(uint256 _requestedBatchSize) external returns (bool done, uint256 remaining, uint256 nextBatchSize) {
        require(!blacklist[msg.sender], "Blacklisted");
        
        SyncState storage state = userSyncStates[msg.sender];
        uint256 totalTokens = activeTokenListByUserCount[msg.sender];
        
        if (totalTokens == 0) {
            state.syncComplete = true;
            return (true, 0, 0);
        }

        if (!state.isSyncing) {
            state.isSyncing = true;
            state.syncComplete = false;
            state.syncedUpTo = 0;
        }

        uint256 start = state.syncedUpTo;
        uint256 batchLimit = _requestedBatchSize > MAX_BATCH_SIZE ? MAX_BATCH_SIZE : _requestedBatchSize;
        uint256 end = start + batchLimit;
        
        if (end > totalTokens) end = totalTokens;

        // Loop through this specific batch and process the math
        for (uint256 i = start; i < end; i++) {
            address pToken = activeTokenListByUser[msg.sender][i];
            _processSingleTokenClaim(msg.sender, pToken);
        }

        state.syncedUpTo = end;

        // Check if we reached the end of the user's subscription list
        if (end == totalTokens) {
            state.isSyncing = false;
            state.syncComplete = true;
            state.syncedUpTo = 0; // Reset for next time
            done = true;
        } else {
            done = false;
            remaining = totalTokens - end;
            nextBatchSize = remaining > MAX_BATCH_SIZE ? MAX_BATCH_SIZE : remaining;
        }

        emit SyncProgress(msg.sender, done, remaining);
    }

    /**
     * @dev Advances a specific token's local ERA based on time elapsed since its inception.
     */
    function setTokenEra(address _payToken) internal {
        TokenEconomy storage tEco = tokenEconomics[_payToken];
        if (!tEco.isAdded) return;

        uint256 timeElapsed = block.timestamp - tEco.startTime;
        uint256 totalDaysElapsed = timeElapsed / eralength;
        
        if (totalDaysElapsed > tEco.currentERA) {
            uint256 diff = totalDaysElapsed - tEco.currentERA;
            for (uint256 i = 0; i < diff; i++) {
                eraRewards[_payToken][tEco.currentERA] = tEco.rewardPerStamp;
                tEco.currentERA++;
            }
        }
    }

    /**
     * @dev The historical math engine. Applies the user's snapshot balance to the missed local ERAs.
    */
    function _processSingleTokenClaim(address user, address pToken) internal {
        // Update the token's clock before doing any math
        setTokenEra(pToken); 
        
        TokenEconomy storage tEco = tokenEconomics[pToken];
        Claim storage claimData = claimRewards[user][pToken];
        
        uint256 startPeriod = claimData.eraAtBlock;
        uint256 endPeriod = tEco.currentERA;
        
        // EARLY EXIT: If no active stake, fast-forward to current ERA and skip loop.
        if (claimData.GAMESent == 0) {
            claimData.eraAtBlock = endPeriod;
            return;
        }

        if (startPeriod < endPeriod) {
            uint256 rewardsAccrued = 0;
            // Iterate over the missed time using the local clock
            for (uint256 e = startPeriod; e < endPeriod; e++) {
                rewardsAccrued += (eraRewards[pToken][e] * claimData.GAMESent);
            }
            
            // Dump calculated rewards into the static bucket
            claimData.rewardsOwed += rewardsAccrued;
            claimData.eraAtBlock = endPeriod; // Reset position to current local ERA
            
            // Add to global debt so the contract knows these funds are spoken for
            uint256 rewardsDue = claimData.rewardsOwed / divisor;
            tEco.allRewardsOwed += rewardsDue;
        }
    }

    // ==========================================
    // DEPOSIT & WITHDRAWAL (State Protected)
    // ==========================================

    function addGAME(uint256 _amount) public nonReentrant {
        require(!paused, "Paused.");
        require(_amount > 0, "Amount > 0.");
        require(!blacklist[msg.sender], "Blacklisted.");
        
        // Critical Lock: Cannot change balance if a sync is pending, otherwise math corrupts
        require(userSyncStates[msg.sender].syncComplete || activeTokenListByUserCount[msg.sender] == 0, "Must finish syncUserTokens first");

        require(GAMEToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed.");

        uint256 toll = (_amount * tax) / 100;
        uint256 amount = _amount - toll;
        TaxTotal += toll;
        
        if (balances[msg.sender] == 0) {
            numberOfParticipants += 1;
        }

        balances[msg.sender] += amount;
        entryMap[msg.sender] = block.timestamp;
        TotalGAMESent += amount;

        // Apply new balance to all subscribed tokens dynamically
        uint256 totalTokens = activeTokenListByUserCount[msg.sender];
        for (uint256 i = 0; i < totalTokens; i++) {
            address pToken = activeTokenListByUser[msg.sender][i];
            
            // 1. SETTLE FIRST: Calculate all rewards earned on the old stake weight
            _processSingleTokenClaim(msg.sender, pToken);

            // 2. Adjust the global staking weights for this specific token
            tokenTotalStaked[pToken] -= claimRewards[msg.sender][pToken].GAMESent;
            tokenTotalStaked[pToken] += balances[msg.sender];
            
            // 3. RE-ENTRY: Snap the new stake to the current local ERA
            claimRewards[msg.sender][pToken].GAMESent = balances[msg.sender];
            claimRewards[msg.sender][pToken].eraAtBlock = tokenEconomics[pToken].currentERA;
        }

        // Drop the lock so they must sync again before next interaction
        userSyncStates[msg.sender].syncComplete = false;

        emit AddGAME(msg.sender, _amount);
    }

    function withdrawGAME() public nonReentrant onlyAfterTimelock {
        require(!paused, "Paused.");
        require(balances[msg.sender] > 0, "No GAME."); 
        
        // Critical Lock
        require(userSyncStates[msg.sender].syncComplete || activeTokenListByUserCount[msg.sender] == 0, "Must finish syncUserTokens first");

        uint256 GAMEAmount = balances[msg.sender];
        balances[msg.sender] = 0;
        TotalGAMESent -= GAMEAmount;

        require(GAMEToken.transfer(msg.sender, GAMEAmount), "Failed Transfer");    

        if (numberOfParticipants > 0) {
            numberOfParticipants -= 1;
            entryMap[msg.sender] = 0; 
        }

        // Remove user's active weight from all token pools
        uint256 totalTokens = activeTokenListByUserCount[msg.sender];
        for (uint256 i = 0; i < totalTokens; i++) {
            address pToken = activeTokenListByUser[msg.sender][i];
            
            // 1. SETTLE FIRST: Secure rewards earned before the stake leaves
            _processSingleTokenClaim(msg.sender, pToken);

            // 2. Adjust global weight
            tokenTotalStaked[pToken] -= claimRewards[msg.sender][pToken].GAMESent;
            
            // 3. WIPE POSITION: Zero out the stake and sync to current ERA
            claimRewards[msg.sender][pToken].GAMESent = 0;
            claimRewards[msg.sender][pToken].eraAtBlock = tokenEconomics[pToken].currentERA;
        }

        userSyncStates[msg.sender].syncComplete = false;

        emit WithdrawGAME(msg.sender, GAMEAmount);
    }

// ==========================================
    // REWARD CALCULATION & CLAIMING
    // ==========================================

    /**
     * @notice Allows the admin (or a script) to inject rewards into a specific token's economy.
     * @dev Used to bootstrap the pool before the first user stakes, or to manually add yields.
     * @param _payToken The address of the reward token.
     * @param _amount The amount of tokens to inject.
     */
    function addRewards(address _payToken, uint256 _amount) external onlyOwner {
        require(_amount > 0, "Must add more than zero");
        
        // Transfer the newly injected rewards into the contract
        IERC20(_payToken).transferFrom(msg.sender, address(this), _amount);
        
        // Immediately trigger a recalculation of this token's live rate
        _setRewards(_payToken); 
    }

    /**
     * @dev Core economy function. Calculates the specific token's live rate based on its 
     * current reserves minus global debt, divided ONLY by the active stake in its specific pool.
     */
    function _setRewards(address _payToken) internal {
        TokenEconomy storage tEco = tokenEconomics[_payToken];
        uint256 stakedInThisToken = tokenTotalStaked[_payToken];
        
        if (stakedInThisToken == 0) return; 

        uint256 contract_balance = IERC20(_payToken).balanceOf(address(this));
        
        if (contract_balance > tEco.allRewardsOwed) {            
            tEco.totalRewards = contract_balance - tEco.allRewardsOwed;
        } else {
            tEco.totalRewards = 0;
        }

        tEco.rewardPerStamp = (tEco.totalRewards * divisor) / (stakedInThisToken * Duration);           
        eraRewards[_payToken][tEco.currentERA] = tEco.rewardPerStamp;
    }

    /**
     * @notice The primary withdrawal function. Syncs historical math, deducts taxes, and pays the user.
     * @param _payTokens Array of token addresses the user wants to withdraw rewards for.
     */
    function claim(address[] calldata _payTokens) public nonReentrant onlyClaimant {  
        require(!paused, "Contract is paused.");
        require(!blacklist[msg.sender], "Address is blacklisted.");
        require(_payTokens.length <= MAX_BATCH_SIZE, "Batch too large");

        for (uint256 i = 0; i < _payTokens.length; i++) {
            address pToken = _payTokens[i];
            
            // 1. Sync the historical math so their `rewardsOwed` is perfectly up to date
            _processSingleTokenClaim(msg.sender, pToken);

            Claim storage claimData = claimRewards[msg.sender][pToken];
            uint256 userRewards = claimData.rewardsOwed;
            
            // Because of our early exit in `_processSingleTokenClaim`, this will cleanly skip empty claims
            if (userRewards == 0) continue;

            // 2. Tax calculations
            uint256 developed = (userRewards / 100) * developTax;
            uint256 estimatedRewards = userRewards - developed;

            uint256 rewards = estimatedRewards / divisor;
            uint256 develop = developed / divisor;

            // 3. Wipe user debt
            claimData.rewardsOwed = 0;
            
            // 4. Reduce global obligations for this specific token
            uint256 spentRewards = rewards + develop;
            tokenEconomics[pToken].allRewardsOwed -= spentRewards; 
            Claimants[msg.sender][pToken] += rewards;

            // 5. Execute Transfers
            IERC20 tkn = IERC20(pToken);
            require(tkn.transfer(msg.sender, rewards), "Transfer failed."); 
            if (develop > 0) {
                require(tkn.transfer(developAddress, develop), "Developer tax transfer failed."); 
            }

            // 6. Recalculate this token's rate after liquidity leaves the contract
            _setRewards(pToken);
            
            emit RewardClaimedByUser(msg.sender, pToken, rewards);
        }

        // Reset their timelock
        UserClaims[msg.sender] = block.timestamp;
    }

    

    /**
     * @notice  Sets tax rates, batch size limits.
     * @dev     Updates the stake tax, development tax, and maximum batch size for operations.
     * @param   _values Array of values to set: [tax, developTax, MAX_BATCH_SIZE, timeLock]
     */
    function setValues(uint256[] calldata _values) external onlyOwner { 
        //taxes
        tax = _values[0]; 
        developTax = _values[1]; 

        //batch size
        MAX_BATCH_SIZE = _values[2];

        //timelock
        timeLock = _values[3];
    }

    /**
     * @notice  Updates the developer address that receives development tax.
     * @dev     Changes the recipient address for development funds.
     * @param   _developerAddress New developer address.
     */
    function setAddresses(address _developerAddress) external onlyGuard { 
        developAddress = _developerAddress;
    }
    /**
     * @notice  Updates the guard address.
     * @dev     Changes the emergency operator address. Can only be called by current guard.
     * @param   _newGuard New guard address.
     */
    function setGuard(address _newGuard) external onlyGuard { require(_newGuard != address(0), "Zero address"); guard = _newGuard; }

    /**
     * @notice  Adds addresses to the blacklist.
     * @dev     Blacklisted addresses cannot stake or claim rewards.
     * @param   _addresses Array of addresses to blacklist.
     */
    function addToBlacklist(address[] calldata _addresses) external onlyOwner { for (uint256 i; i < _addresses.length; i++) blacklist[_addresses[i]] = true; }
    /**
     * @notice  Removes addresses from the blacklist.
     * @dev     Restores staking and claiming capabilities for the specified addresses.
     * @param   _addresses Array of addresses to remove from blacklist.
     */
    function removeFromBlacklist(address[] calldata _addresses) external onlyOwner { for (uint256 i; i < _addresses.length; i++) blacklist[_addresses[i]] = false; }

    
    /**
     * @notice  Pauses or unpauses the contract.
     * @dev     Can only be called by the guard.
     * @param   _p True to pause, false to unpause.
     */
    function pause(bool _p) external onlyGuard { 
        if (_p) {
            require(!paused, "Contract already paused."); 
            paused = true; 
        } else {
            require(paused, "Contract not paused."); 
            paused = false; 
        }
    }

}