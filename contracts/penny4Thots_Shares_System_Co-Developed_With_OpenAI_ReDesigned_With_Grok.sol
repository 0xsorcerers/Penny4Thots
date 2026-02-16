// SPDX-License-Identifier: MIT
//Penny4Thots Shares System Co-Developed with OpenAI GPT-5.0/GPT-4.0
//Re-Designed by Grok.

pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/utils/ReentrancyGuard.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/IERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v5.0/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFarm {
    function balanceOf(address _sender) external view returns (uint256);
}

contract Penny4Thots is ReentrancyGuard {

    constructor(address _dAI, address _pennyDAO) {
        dAI = _dAI;
        pennyDAO = _pennyDAO;
    }

    using SafeERC20 for IERC20;
    
    event ProofOfMarket(uint256 indexed marketId, address indexed creator, address indexed paymentToken, uint256 amount);
    event Claimed(address indexed user, uint256 indexed marketId, uint256 indexed positionId, address token, uint256 amount);
    event CapitalRescued(uint256 indexed marketId, address token, uint256 amount);

    address public pennyDAO;
    address private dAI;
    address public bobbAddress;
    address public stakeAddress;
    address private developmentAddress;
    address private lastAddress;
    uint256 public payId = 0;
    uint256 public createtax = 0;
    uint256 public bobbtax = 0;
    uint256 public staketax = 0;
    uint256 public lasttax = 0;
    uint256 public devtax = 0;
    uint256 public gasfee = 0;
    uint256 public platformFee = 5;
    uint256 public marketCount = 0;
    uint256 public constant BPS = 10000;
    uint256 public DECAY_WINDOW_BPS = 700;   // last 7%
    uint256 public DECAY_PROFIT_BPS = 8500;  // 85% soft glow for late entries ✨
    uint256 public KAMIKAZE_BURN_BPS = 5000; // 50% capital burn
    uint256 public MAX_FINALIZE_BATCH = 200;

    string public Author = "https://github.com/0xsorcerers";
    bool public paused = false; 

    modifier onlyPennyDAO() {
        require(msg.sender == pennyDAO, "Not authorized.");
        _;
    }

    modifier onlydAI() {
        require(msg.sender == dAI, "Not authorized.");
        _;
    }

    enum Side { None, A, B }

    struct Position {
        address user;
        Side side;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
        bool kamikazed;
    }

    struct TokenInfo {
        IERC20 paytoken;
    }

    struct MarketInfo {
        uint256 indexer;
        string title;
        string subtitle;
        string description;
        string image;
        string tags;
        string optionA;
        string optionB;
        bool feetype;
    }    
    
    struct MarketData {
        address creator;
        uint256 marketBalance;
        uint256 activity;
        uint256 aVotes;
        uint256 bVotes;

        uint256 startTime;
        uint256 endTime;
        bool closed;
        Side winningSide;

        uint256 totalSharesA;
        uint256 totalSharesB;
        uint256 totalWinningPrincipal;  // NEW: sum of original winning positions for clean principal return

        uint256 positionCount;
        bool blacklist;
    }

    struct MarketLock {
        uint256 finalizedUpTo;
        bool sharesFinalized;
    }

    struct ClaimRecord {
        uint256 marketId;
        address token;
        uint256 amount;
        uint256 timestamp;
        uint256 positionId;
    }

    TokenInfo[] public AllowedCrypto;
    address[] public AllowedFarms;
    uint256[] public AllowedAmounts;
    uint256[] public permittedFarms;

    mapping (uint256 => MarketInfo) private allMarkets;
    mapping (uint256 => MarketData) public allMarketData;
    mapping (uint256 => MarketLock) public allMarketLocks;

    mapping (uint256 => address) public paymentTokens;
    mapping (address => uint256) public allMarketVolume;
    mapping (address => uint256) public farmTokensDistributed;
    mapping (address => uint256) public TotalClaimsDistributed;
    mapping (address => uint256) public TotalKamikazeBurns;
    mapping (address => uint256) public TotalPromoBurns;
    mapping (address => uint256) public TotalPromoStaked;
    mapping (address => uint256) public TotalPromoPaid;
    mapping (address => uint256) public TotalPromoReserved;
    
    mapping (address => uint256) public userTotalThots;
    mapping (address => uint256) public userTotalMarkets;    
    mapping(address => mapping(uint256 => uint256)) public userThots;
    mapping(address => mapping(uint256 => uint256)) public userMarkets;

    mapping(address => uint256) public userTotalClaimHistory;
    mapping(address => mapping(uint256 => ClaimRecord)) public userClaimHistory;
    mapping(uint256 => mapping(uint256 => Position)) public positions;
    mapping(uint256 => mapping(address => uint256)) public totalProfit;
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userPositions;
    mapping(uint256 => mapping(address => uint256)) public userPositionCount;

    mapping(address => mapping(address => uint256)) public userTokenClaims;
    mapping(uint256 => mapping(address => uint256)) public marketTokenClaims;
    mapping(uint256 => mapping(address => uint256)) public totalClaimedSoFar;
    mapping(address => mapping(uint256 => mapping(address => uint256))) public userMarketTokenClaims;
    
    function addCurrency(IERC20 _paytoken) external onlyPennyDAO {
        AllowedCrypto.push(TokenInfo({paytoken: _paytoken}));
    }

    function readMarket(uint256[] calldata _ids) public view returns (MarketInfo[] memory) {
        require(_ids.length > 0, "Invalid Range Call");
        MarketInfo[] memory result = new MarketInfo[](_ids.length);     
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
            result[i] = allMarkets[id];
        }
        return result;
    }

    function readMarketData(uint256[] calldata _ids) public view returns (MarketData[] memory) {
        require(_ids.length > 0, "Invalid Range Call");
        MarketData[] memory result = new MarketData[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            uint256 id = _ids[i];
                result[i] = allMarketData[id];
        }
        return result;
    }

    function fetchDataConstants () public view returns (uint256[] memory result, bool[] memory result2)  {
        result = new uint256[](14);
        result2 = new bool[](1);

        result[0]  = marketCount;
        result[1]  = payId;
        result[2]  = platformFee;
        result[3]  = createtax;
        result[4]  = bobbtax;
        result[5]  = staketax;
        result[6] = lasttax;
        result[7] = devtax;
        result[8] = gasfee;
        result[9] = BPS;
        result[10] = DECAY_WINDOW_BPS;
        result [11] = DECAY_PROFIT_BPS;
        result [12] = KAMIKAZE_BURN_BPS;
        result [13] = MAX_FINALIZE_BATCH;

        result2[0] = paused;

        return (result, result2);
    }

    function writeMarket(string[] calldata _info, uint256 _marketBalance, bool _signal, bool _feetype, address _paymentToken, uint256 _endTime) external payable nonReentrant {
        require(!paused && _marketBalance > 0 && (_endTime > block.timestamp + 1 hours), "Call Reverted.");
        uint256 creditBalance;
        uint256 market;

        //payment systems
        if (_feetype) {
            market = marketCount++;
            require(_paymentToken != address(0) && msg.value >= gasfee && !allMarketData[market].blacklist, "Dropped.");
            uint256 received = transferTokens(_marketBalance, _paymentToken);
            creditBalance = burn(received, platformFee, _paymentToken, market);
            paymentTokens[market] = _paymentToken;
            allMarketVolume[_paymentToken] += creditBalance;            
            (bool success, ) = payable(dAI).call{value: gasfee}("");
            require(success, "Funds transfer failed.");
        } else {
            market = marketCount++;
            uint256 fee = feeTransfer(msg.value, platformFee, market);
            require(msg.value > fee && !allMarketData[market].blacklist, "Failed requirement.");
            creditBalance = fee;
            allMarketVolume[address(0)] += creditBalance;
        }

        //create MarketInfo
        allMarkets[market].indexer = market;
        allMarkets[market].title = _info[0];
        allMarkets[market].subtitle = _info[1];
        allMarkets[market].description = _info[2];
        allMarkets[market].image = _info[3];
        allMarkets[market].tags = _info[4];
        allMarkets[market].optionA = _info[5];
        allMarkets[market].optionB = _info[6];
        allMarkets[market].feetype = _feetype;

        //create associated marketData
        allMarketData[market].creator = msg.sender;
        if (_signal) {
            allMarketData[market].aVotes++;
        } else {
            allMarketData[market].bVotes++;
        }

        allMarketData[market].marketBalance += creditBalance;
        
        //mint a position tranche
        Side side = _signal ? Side.A : Side.B;
        uint256 posId = allMarketData[market].positionCount++;

        positions[market][posId] = Position({
            user: msg.sender,
            side: side,
            amount: creditBalance,
            timestamp: block.timestamp,
            claimed: false,
            kamikazed: false
        });
        
        uint256 _index = userPositionCount[market][msg.sender];
        userPositions[market][msg.sender][_index] = posId;
        userPositionCount[market][msg.sender] = _index + 1;

        allMarketData[market].activity++;

        uint256 index = userTotalThots[msg.sender];
        userThots[msg.sender][index] = market;
        userTotalThots[msg.sender] = index + 1;

        lastAddress = msg.sender;
        promoDistribution();

        allMarketData[market].startTime = block.timestamp;
        allMarketData[market].endTime = _endTime; 

        emit ProofOfMarket(market, msg.sender, _paymentToken, creditBalance);
    }

    function vote(bool _signal, uint256 _market, uint256 _marketBalance) external payable nonReentrant {
        require(!paused && _marketBalance > 0, "Call Reverted.");
        MarketData storage m = allMarketData[_market];
        require(!m.closed, "Already closed");
        uint256 credit;

        //payment systems
        if (allMarkets[_market].feetype) {
            address paytoken = paymentTokens[_market];  
            require(paytoken != address(0) && msg.value >= gasfee && !allMarketData[_market].blacklist, "Dropped.");
            uint256 received = transferTokens(_marketBalance, paytoken);
            credit = burn(received, platformFee, paytoken, _market);
            allMarketVolume[paytoken] += credit;          
            (bool success, ) = payable(dAI).call{value: gasfee}("");
            require(success, "Funds transfer failed.");
        } else {
            uint256 fee = feeTransfer(msg.value, platformFee, _market);
            require(msg.value >= _marketBalance && !allMarketData[_market].blacklist, "Failed requirement.");
            credit = fee;
            allMarketVolume[address(0)] += credit;
        }        
        
        allMarketData[_market].marketBalance += credit;

        //mint a position tranche
        Side side = _signal ? Side.A : Side.B;
        uint256 posId = allMarketData[_market].positionCount++;

        positions[_market][posId] = Position({
            user: msg.sender,
            side: side,
            amount: credit,
            timestamp: block.timestamp,
            claimed: false,
            kamikazed: false
        });
        
        uint256 _index = userPositionCount[_market][msg.sender];
        userPositions[_market][msg.sender][_index] = posId;
        userPositionCount[_market][msg.sender] = _index + 1;

        //update associated marketData
        if (_signal) {
            allMarketData[_market].aVotes++;
        } else {
            allMarketData[_market].bVotes++;
        }

        allMarketData[_market].activity++;
        uint256 index = userTotalMarkets[msg.sender];
        userMarkets[msg.sender][index] = _market;
        userTotalMarkets[msg.sender] = index + 1;

        lastAddress = msg.sender;
        promoDistribution();

    }


    function _calculateShares(uint256 marketId, Position memory p) internal view returns (uint256 shares, bool decayed) {
        MarketData memory m = allMarketData[marketId];
        uint256 T = m.endTime - p.timestamp;
        uint256 fullDuration = m.endTime - m.startTime;
        uint256 decayStart = m.endTime - (fullDuration * DECAY_WINDOW_BPS / BPS);

        shares = p.amount * T;
        if (p.timestamp >= decayStart) {
            shares = shares * DECAY_PROFIT_BPS / BPS;  // 85% soft shimmer for late entries ✨
            decayed = true;
        }
    }

    function closeMarket(uint256 _market, bool _signalWinner) external onlydAI {
        MarketData storage m = allMarketData[_market];
        require(!m.closed, "Already closed");
        m.closed = true;
        m.endTime = block.timestamp;
        m.winningSide = _signalWinner ? Side.A : Side.B;
    }

    function finalizeShares(uint256 _market) external onlydAI returns (bool done, uint256 remaining, uint256 nextBatchSize) {
        MarketData storage m = allMarketData[_market];
        MarketLock storage k = allMarketLocks[_market];
        require(m.closed, "Not closed");
        require(!k.sharesFinalized, "Already finalized");

        uint256 start = k.finalizedUpTo;
        uint256 end = start + MAX_FINALIZE_BATCH;
        if (end > m.positionCount) end = m.positionCount;

        for (uint256 i = start; i < end; i++) {
            Position memory p = positions[_market][i];
            if (p.side != m.winningSide) continue;

            (uint256 shares,) = _calculateShares(_market, p);

            if (m.winningSide == Side.A) {
                m.totalSharesA += shares;
            } else {
                m.totalSharesB += shares;
            }
            m.totalWinningPrincipal += p.amount;  // Track for clean principal return
        }

        k.finalizedUpTo = end;

        if (end == m.positionCount) {
            k.sharesFinalized = true;
            done = true;
        } else {
            done = false;
            remaining = m.positionCount - end;
            nextBatchSize = remaining > MAX_FINALIZE_BATCH ? MAX_FINALIZE_BATCH : remaining;
        }
    }

    /**@dev Kamikaze one or several votes 
     * @notice This function is used to close a position by taking a 50% haircut.
     * @param _market The market ID
     * @param _posId The position ID
     */
    function kamikaze(uint256 _market, uint256 _posId) public nonReentrant {
        MarketData storage m = allMarketData[_market];
        require(!allMarketData[_market].blacklist && !m.closed, "Market closed by AI.");

        Position storage p = positions[_market][_posId];
        require(p.user == msg.sender, "Not yours.");
        require(!p.claimed, "Claimed.");

        uint256 burned = p.amount * KAMIKAZE_BURN_BPS / BPS;
        uint256 remaining = p.amount - burned;

        // Burn stays in pool (zero-sum boost to others)
        address paymentToken = paymentTokens[_market];
        TotalKamikazeBurns[paymentToken] += burned;
        allMarketVolume[paymentToken] += burned;

        // Switch side
        p.side = (p.side == Side.A ? Side.B : Side.A);
        p.amount = remaining;
        p.timestamp = block.timestamp;
        p.kamikazed = true;

        allMarketData[_market].activity++;
    }

    function batchKamikaze(uint256 _market, uint256[] calldata _posIds) external {
        for (uint256 i; i < _posIds.length; i++) {
            kamikaze(_market, _posIds[i]);
        }
    }

    // Internal function to pay the user.
    function _payout(uint256 _market, address _to, uint256 _amount, uint256 _posId ) internal {
        address token = paymentTokens[_market];
        uint256 amount;

        // === Transfer ===
        if (token == address(0)) {
            amount = feeTransfer(_amount, platformFee, _market);
            (bool success, ) = payable(_to).call{value: amount}("");
            require(success, "Funds transfer failed.");
        } else {
            amount = burn(_amount, platformFee, token, _market);
            IERC20(token).safeTransfer(_to, amount);
        }

        // === Accounting Ledgers ===
        userMarketTokenClaims[_to][_market][token] += _amount;
        userTokenClaims[_to][token] += _amount;
        marketTokenClaims[_market][token] += _amount;

        TotalClaimsDistributed[token] += _amount;

        // === Claim History ===            
        uint256 index = userTotalClaimHistory[msg.sender];
        userClaimHistory[msg.sender][index] = ClaimRecord({
                marketId: _market,
                token: token,
                amount: _amount,
                timestamp: block.timestamp,
                positionId: _posId
        });
        userTotalClaimHistory[msg.sender] = index + 1;

        totalClaimedSoFar[_market][token] += _amount;


        allMarketData[_market].activity++;
        emit Claimed(_to, _market, _posId, token, _amount);
    }
    
    function isClaimable(address _user, uint256 _market, uint256[] calldata _posIds) public view returns (uint256[] memory) {
        MarketData storage m = allMarketData[_market];
        uint256 total = _posIds.length;
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            Position storage p = positions[_market][_posIds[i]];
            if (
                p.user == _user &&
                !p.claimed &&
                p.side == m.winningSide
            ) {
                count++;
            }
        }

        uint256[] memory claimable = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < total; i++) {
            Position storage p = positions[_market][_posIds[i]];
            if (
                p.user == _user &&
                !p.claimed &&
                p.side == m.winningSide
            ) {
                claimable[index] = _posIds[i];
                index++;
            }
        }

        return claimable;
    }

    // claim & batchClaim now return PRINCIPAL + profit-from-losing-side only
    function claim(uint256 _market, uint256 _posId) public nonReentrant {
        MarketData storage m = allMarketData[_market];
        MarketLock storage k = allMarketLocks[_market];
        require(m.closed && k.sharesFinalized && !m.blacklist, "Not ready");

        Position storage p = positions[_market][_posId];
        require(p.user == msg.sender && !p.claimed && p.side == m.winningSide, "Invalid claim");

        (uint256 shares,) = _calculateShares(_market, p);
        uint256 totalWinningShares = m.winningSide == Side.A ? m.totalSharesA : m.totalSharesB;
        uint256 loserPool = m.marketBalance > m.totalWinningPrincipal ? m.marketBalance - m.totalWinningPrincipal : 0;
        uint256 profitShare = totalWinningShares > 0 ? loserPool * shares / totalWinningShares : 0;
        uint256 payout = p.amount + profitShare;  // Principal flies back + profit share ✨

        p.claimed = true;
        _payout(_market, msg.sender, payout, _posId);
    }
    
    function batchClaim(uint256 _market, uint256[] calldata _posIds) external nonReentrant {
        MarketData storage m = allMarketData[_market];
        MarketLock storage k = allMarketLocks[_market];

        require(!allMarketData[_market].blacklist, "Market closed by AI");
        require(m.closed && k.sharesFinalized, "Not closed");

        for (uint256 i = 0; i < _posIds.length; i++) {
            uint256 posId = _posIds[i];
            Position storage p = positions[_market][posId];

            // Skip non-redeemables
            if (p.user != msg.sender) continue;
            if (p.claimed) continue;
            if (p.side != m.winningSide) continue;

            (uint256 shares,) = _calculateShares(_market, p);

            uint256 totalWinningShares =
                m.winningSide == Side.A ? m.totalSharesA : m.totalSharesB;

            uint256 payout = m.marketBalance * shares / totalWinningShares;

            p.claimed = true;
            _payout(_market, msg.sender, payout, posId);

            m.activity++;
        }
    }

    function promoDistribution() internal { 
        if (AllowedFarms.length > 0) {
            for (uint256 f = 0; f < permittedFarms.length; f++) {  
                uint256 indexFarm = permittedFarms[f]; 
                address currentFarm = AllowedFarms[indexFarm];
                IERC20 farmtoken = IERC20(currentFarm);      
                uint256 farmbal = IFarm(currentFarm).balanceOf(address(this));
                uint256 farm = AllowedAmounts[indexFarm];
                if (farmbal > farm && farm > 0) {        
                    farmtoken.transfer(lastAddress, farm);
                    farmTokensDistributed[currentFarm] += farm;
                }       
            }
        }
    }

    function getUserThots(address _user, uint256 _start, uint256 _finish) external view returns (uint256[] memory) {
        uint256 end = userTotalThots[_user];
        require(_start < _finish && _finish <= end, "Invalid request.");

        uint256[] memory thots = new uint256[](_finish); 
        for (uint256 i = 0; i < _finish; i++) {              
            thots[i] = userThots[_user][_start + i]; // bad requests are returned as 0
        }
        return thots;
    }

    function getUserMarkets(address _user, uint256 _start, uint256 _finish) external view returns (uint256[] memory) {
        uint256 end = userTotalMarkets[_user];
        require(_start < _finish && _finish <= end, "Invalid request.");

        uint256[] memory markets = new uint256[](_finish); 
        for (uint256 i = 0; i < _finish; i++) {              
            markets[i] = userMarkets[_user][_start + i]; // bad requests are returned as 0
        }

        return markets;
    }

    function getUserClaims(address _user, uint256 _start, uint256 _finish) external view returns (ClaimRecord[] memory) {
        uint256 end = userTotalClaimHistory[_user];
        require(_start < _finish && _finish <= end, "Invalid request.");

        ClaimRecord[] memory claims = new ClaimRecord[](_finish); 
        for (uint256 i = 0; i < _finish; i++) {
            claims[i] = userClaimHistory[_user][_start + i];
        }

        return claims;
    }
    
    function getUserPositions(uint256 _market, address _user, uint256 _start, uint256 _finish) external view returns (uint256[] memory) {
        uint256 end = userPositionCount[_market][_user];
        require(_start < _finish && _finish <= end, "Invalid request.");

        uint256[] memory usermarketpositions = new uint256[](_finish);

        for (uint256 i = 0; i < _finish; i++) {
            usermarketpositions[i] = userPositions[_market][_user][_start + i];
        }

        return usermarketpositions;
    }


    function rescueLostCapital(uint256 _market) external onlyPennyDAO nonReentrant {
        MarketData storage m = allMarketData[_market];
        MarketLock storage k = allMarketLocks[_market];
        require(m.closed && k.sharesFinalized, "Market not finalized");
        uint256 winningShares = m.winningSide == Side.A ? m.totalSharesA : m.totalSharesB;
        require(winningShares == 0 && m.marketBalance > 0, "No lost capital to rescue");

        address token = paymentTokens[_market];
        uint256 amount = m.marketBalance;
        m.marketBalance = 0;

        if (token == address(0)) {
            (bool success, ) = payable(pennyDAO).call{value: amount}("");
            require(success, "ETH rescue failed");
        } else {
            IERC20(token).safeTransfer(pennyDAO, amount);
        }

        emit CapitalRescued(_market, token, amount);
    }

    function feeTransfer(uint256 _amount, uint256 _num, uint256 _market) internal returns (uint256) {
        require(dAI != address(0) || stakeAddress != address(0) || developmentAddress != address(0), "Addresses not set.");
        uint256 taxed = (_amount / 100 ) / _num; 
        uint256 dev =  taxed / 2;

        uint256 create = (dev * createtax) / 100;
        uint256 dai = (dev * bobbtax) / 100; // gas computation allocation
        uint256 stake = (dev * staketax) / 100;
        uint256 last = (dev * lasttax) / 100;

        uint256 rem = (dev * (100 - (createtax + bobbtax + staketax + lasttax)) ) / 100;
        uint256 out = dev + rem;

        uint256 untouched = _amount - taxed;

        TotalPromoReserved[address(0)] += dai;
        TotalPromoStaked[address(0)] += stake;
        TotalPromoPaid[address(0)] += last;
        TotalPromoBurns[address(0)] += create;

        address creator = allMarketData[_market].creator;

        if (creator != address(0)) {
            (bool success, ) = payable(creator).call{value: create}("");
            require(success, "Funds transfer failed.");
        } else {
            (bool success0, ) = payable(developmentAddress).call{value: create}("");
            require(success0, "Funds transfer failed.");            
        }

        (bool success1, ) = payable(dAI).call{value: dai}("");
        require(success1, "Funds transfer failed.");

        (bool success2, ) = payable(stakeAddress).call{value: stake}("");
        require(success2, "Funds transfer failed.");
        
        if (lastAddress != address(0)) {
            (bool success3, ) = payable(lastAddress).call{value: last}("");
            require(success3, "Funds transfer failed.");
        }
        
        (bool success4, ) = payable(developmentAddress).call{value: out}("");
        require(success4, "Funds transfer failed.");

        return untouched;
    }
    
    function burn(uint256 _burnAmount, uint256 _denominator, address _paymentToken, uint256 _market) internal returns (uint256) {
        require(bobbAddress != address(0) || stakeAddress != address(0) || developmentAddress != address(0), "Addresses not set.");

        IERC20 paytoken = IERC20(_paymentToken);
        uint256 taxed = (_burnAmount / 100 ) / _denominator;

        uint256 create = (taxed * createtax) / 100;
        uint256 bobb = (taxed * bobbtax) / 100;
        uint256 stake = (taxed * staketax) / 100;
        uint256 last = (taxed * lasttax) / 100;
        uint256 dev =  (taxed * devtax) / 100;

        uint256 untouched = _burnAmount - taxed;

        TotalPromoReserved[_paymentToken] += bobb;
        TotalPromoStaked[_paymentToken] += stake;
        TotalPromoPaid[_paymentToken] += last;
        TotalPromoBurns[_paymentToken] += create;

        address creator = allMarketData[_market].creator;
        if (creator != address(0)) {
            paytoken.safeTransfer(creator, create);
        } else {
            paytoken.safeTransfer(developmentAddress, create);
        }
        paytoken.safeTransfer(bobbAddress, bobb);
        paytoken.safeTransfer(stakeAddress, stake);
        if (lastAddress != address(0)) paytoken.safeTransfer(lastAddress, last);
        paytoken.safeTransfer(developmentAddress, dev);

        return untouched;
    }
    
    function transferTokens(uint256 _cost, address _paytoken) internal returns (uint256) {
        IERC20 token = IERC20(_paytoken);
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), _cost);
        uint256 received = token.balanceOf(address(this)) - before;
        return received;
    } 

    function setValues (uint256 _feeInWei, uint256 _payId, uint256[] calldata _taxes, uint256[] calldata _decay) external onlyPennyDAO() {
        require((_taxes[1] + _taxes[2] + _taxes[3] + _taxes[4] + _taxes[5]) <= 100, "Invalid tax config");
        gasfee = _feeInWei;
        payId = _payId;
        platformFee = _taxes[0];
        createtax = _taxes[1];
        bobbtax = _taxes[2];
        staketax = _taxes[3];
        lasttax = _taxes[4];
        devtax = _taxes[5];
        DECAY_WINDOW_BPS = _decay[0];  // last 7%
        DECAY_PROFIT_BPS = _decay[1]; // % profit haircut
        KAMIKAZE_BURN_BPS = _decay[2]; // % capital burn
        MAX_FINALIZE_BATCH = _decay[3]; // loop runtime
    } 

    function addToBlacklist(uint256[] calldata _ids) external {
        require(msg.sender == dAI || msg.sender == pennyDAO, "Not authorized.");
        for (uint256 i = 0; i < _ids.length; i++) {
            allMarketData[_ids[i]].blacklist = true;
        }
    }

    function removeFromBlacklist(uint256[] calldata _ids) external {
        require(msg.sender == dAI || msg.sender == pennyDAO, "Not authorized.");
        for (uint256 i = 0; i < _ids.length; i++) {
            allMarketData[_ids[i]].blacklist = false;
        }
    }
    
    function setAddresses (address _bobbAddress, address _stakeAddress, address _devAddress) external onlyPennyDAO {
        bobbAddress = _bobbAddress;
        developmentAddress = _devAddress;
        stakeAddress = _stakeAddress;
    }
    
    function setDAOs (address _dAI, address _pennyDAO) external onlyPennyDAO {
        dAI = _dAI;
        pennyDAO = _pennyDAO;        
    }

    function setFarmYield (address[] memory _allowedFarms, uint256[] memory _farmingAmounts, uint256[] memory _permittedFarms) external onlyPennyDAO {
        permittedFarms = _permittedFarms;
        AllowedAmounts = _farmingAmounts;
        AllowedFarms = _allowedFarms;
    }
}