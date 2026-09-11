// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HubToken
 * @dev Official ERC-20 Platform Reward Token ($HUB) for ChainHub.
 * Rewards donors and referrers automatically on every on-chain interaction.
 */
contract HubToken is ERC20, Ownable {
    mapping(address => bool) public authorizedMinters;

    event MinterStatusUpdated(address indexed minter, bool isAuthorized);

    modifier onlyMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint HUB");
        _;
    }

    constructor(address _initialOwner) ERC20("ChainHub Token", "HUB") Ownable(_initialOwner) {
        // Zero pre-mint: tokens are minted strictly on contribution or referral
    }

    function setMinter(address _minter, bool _status) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        authorizedMinters[_minter] = _status;
        emit MinterStatusUpdated(_minter, _status);
    }

    function mintReward(address _to, uint256 _amount) external onlyMinter {
        require(_to != address(0), "Cannot mint to zero address");
        _mint(_to, _amount);
    }
}

/**
 * @dev Standard Reentrancy Guard to protect vault fund releases.
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @title Campaign
 * @dev Crowdfunding campaign with Multi-Tier Referrals, Dynamic Cuts (3%, 5%, 10%),
 * and Automated $HUB Token Rewards.
 */
contract Campaign is ReentrancyGuard {

    struct Member {
        address userAddress;
        address referrer;
        string referralCode;
        uint256 directReferralCount;
        uint256 tierLevel;
        uint256 contribution;
        uint256 earnedAmount;
        bool isQualified;
        uint256 qualifiedPercentage;
    }

    struct CampaignDetails {
        address admin;
        address manager;
        address organizer;
        string title;
        string description;
        string rootReferralCode;
        uint256 targetAmount;
        uint256 totalCollected;
        uint256 balance;
        uint256 participantCount;
        bool isCompleted;
        bool isDeleted;
        bool isActive;
        address hubTokenAddress;
    }

    // ─── State Variables ────────────────────────────────────────────────────────
    address public admin;
    address public manager;
    address public organizer;
    string public title;
    string public description;
    string public rootReferralCode;
    uint256 public targetAmount;
    uint256 public totalCollected;
    uint256 public participantCount;
    bool public isCompleted;
    bool public isDeleted;
    bool public isActive;

    HubToken public hubToken; // $HUB Token Contract Instance

    // $HUB Reward Multipliers (18 Decimals)
    // 1 ETH = 10,000 HUB (e.g. 0.001 ETH = 10 HUB)
    uint256 public constant HUB_PER_ETH = 10_000;
    uint256 public constant REFERRAL_BONUS_HUB = 5 * 10 ** 18;  // 5 HUB to Referrer
    uint256 public constant GOAL_COMPLETION_HUB = 50 * 10 ** 18; // 50 HUB to Organizer

    mapping(address => Member) public members;
    mapping(string => address) public codeToMember;
    address[] public memberList;

    // ─── Events ─────────────────────────────────────────────────────────────────
    event UserJoined(
        address indexed user,
        address indexed referrer,
        uint256 amount,
        string usedReferral,
        string generatedCode,
        uint256 tierLevel,
        uint256 hubRewarded
    );
    event CampaignStatusUpdated(bool isActive);
    event CampaignDeleted(address indexed deletedBy);
    event FundsReleased(
        address indexed organizer,
        uint256 organizerAmount,
        uint256 totalReferralDistributed,
        uint256 totalBalanceDistributed
    );
    event HubRewardDistributed(address indexed recipient, uint256 amount, string rewardType);

    // ─── Modifiers ──────────────────────────────────────────────────────────────
    modifier onlyAdminOrManagerOrOrganizer() {
        require(
            msg.sender == admin || msg.sender == manager || msg.sender == organizer,
            "Only Admin, Manager, or Organizer allowed"
        );
        _;
    }

    constructor(
        address _admin,
        address _manager,
        address _organizer,
        address _hubToken,
        string memory _title,
        string memory _description,
        string memory _rootReferralCode,
        uint256 _targetAmountInWei
    ) {
        require(_targetAmountInWei > 0, "Target must be > 0");
        require(bytes(_rootReferralCode).length > 0, "Root referral code required");

        admin = _admin;
        manager = _manager;
        organizer = _organizer != address(0) ? _organizer : _manager;
        hubToken = HubToken(_hubToken);
        title = _title;
        description = _description;
        rootReferralCode = _rootReferralCode;
        targetAmount = _targetAmountInWei;
        isActive = true;
        isCompleted = false;
        isDeleted = false;

        // Initialize Admin as Tier 0 root node
        members[admin] = Member({
            userAddress: admin,
            referrer: address(0),
            referralCode: _rootReferralCode,
            directReferralCount: 0,
            tierLevel: 0,
            contribution: 0,
            earnedAmount: 0,
            isQualified: false,
            qualifiedPercentage: 0
        });
        codeToMember[_rootReferralCode] = admin;
    }

    function _generateCode(address _user, uint256 _nonce) internal view returns (string memory) {
        bytes memory chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        bytes memory result = new bytes(7);
        bytes32 hash = keccak256(
            abi.encodePacked(address(this), _user, block.timestamp, _nonce, block.prevrandao)
        );
        for (uint256 i = 0; i < 7; i++) {
            result[i] = chars[uint8(hash[i]) % chars.length];
        }
        return string(result);
    }

    /**
     * @notice Join or back the campaign with ETH and auto-earn $HUB reward tokens.
     */
    function joinCampaign(string memory _usedReferral) public payable nonReentrant {
        require(isActive && !isCompleted, "Campaign is not active");
        require(msg.value > 0, "Contribution amount must be greater than 0");
        require(msg.sender != organizer, "Organizer cannot donate to own campaign");

        address referrerAddr = codeToMember[_usedReferral];
        if (referrerAddr == address(0)) {
            referrerAddr = admin;
        }

        string memory userRefCode = "";
        uint256 newTier = 1;

        if (members[msg.sender].userAddress == address(0)) {
            uint256 referrerTier = members[referrerAddr].tierLevel;
            newTier = referrerTier + 1;
            members[referrerAddr].directReferralCount++;

            string memory generatedCode = _generateCode(msg.sender, participantCount);
            while (codeToMember[generatedCode] != address(0)) {
                generatedCode = _generateCode(msg.sender, block.timestamp + participantCount);
            }
            codeToMember[generatedCode] = msg.sender;
            userRefCode = generatedCode;

            members[msg.sender] = Member({
                userAddress: msg.sender,
                referrer: referrerAddr,
                referralCode: generatedCode,
                directReferralCount: 0,
                tierLevel: newTier,
                contribution: msg.value,
                earnedAmount: 0,
                isQualified: false,
                qualifiedPercentage: 0
            });

            memberList.push(msg.sender);
            participantCount++;
        } else {
            members[msg.sender].contribution += msg.value;
            userRefCode = members[msg.sender].referralCode;
            newTier = members[msg.sender].tierLevel;
        }

        totalCollected += msg.value;

        // ─── $HUB Token Rewards Distribution ─────────────────────────────────
        uint256 donorHubReward = (msg.value * HUB_PER_ETH);
        if (address(hubToken) != address(0)) {
            // 1. Mint to Donor (10,000 HUB per 1 ETH)
            try hubToken.mintReward(msg.sender, donorHubReward) {
                emit HubRewardDistributed(msg.sender, donorHubReward, "DONATION_BACKER");
            } catch {}

            // 2. Mint Referral Bonus to Inviter (5 HUB)
            if (referrerAddr != address(0) && referrerAddr != admin) {
                try hubToken.mintReward(referrerAddr, REFERRAL_BONUS_HUB) {
                    emit HubRewardDistributed(referrerAddr, REFERRAL_BONUS_HUB, "REFERRAL_INVITE");
                } catch {}
            }

            // 3. Goal Completion Achievement Bonus (50 HUB to Organizer)
            if (totalCollected >= targetAmount && address(this).balance > 0) {
                try hubToken.mintReward(organizer, GOAL_COMPLETION_HUB) {
                    emit HubRewardDistributed(organizer, GOAL_COMPLETION_HUB, "GOAL_ACHIEVED");
                } catch {}
            }
        }

        emit UserJoined(
            msg.sender,
            referrerAddr,
            msg.value,
            _usedReferral,
            userRefCode,
            newTier,
            donorHubReward
        );
    }

    function getMemberPercentage(address _user) public view returns (uint256) {
        Member memory m = members[_user];
        if (m.tierLevel == 0) {
            return m.directReferralCount >= 3 ? 3 : 0;
        } else if (m.tierLevel == 1) {
            return m.directReferralCount >= 2 ? 5 : 0;
        } else if (m.tierLevel == 2) {
            return m.directReferralCount >= 3 ? 10 : 0;
        }
        return 0;
    }

    function getEarningsPreview()
        external
        view
        returns (
            address[] memory qualifiedMembers,
            uint256[] memory percentages,
            uint256[] memory amountsInWei,
            uint256 organizerCutInWei,
            uint256 totalBalanceInWei
        )
    {
        uint256 currentBal = address(this).balance;
        uint256 totalQualifiedCount = 0;

        bool adminQual = (members[admin].directReferralCount >= 3);
        if (adminQual) totalQualifiedCount++;

        for (uint256 i = 0; i < memberList.length; i++) {
            if (getMemberPercentage(memberList[i]) > 0) {
                totalQualifiedCount++;
            }
        }

        qualifiedMembers = new address[](totalQualifiedCount);
        percentages = new uint256[](totalQualifiedCount);
        amountsInWei = new uint256[](totalQualifiedCount);

        uint256 idx = 0;
        uint256 totalReferralCuts = 0;

        if (adminQual) {
            qualifiedMembers[idx] = admin;
            percentages[idx] = 3;
            uint256 cut = (currentBal * 3) / 100;
            amountsInWei[idx] = cut;
            totalReferralCuts += cut;
            idx++;
        }

        for (uint256 i = 0; i < memberList.length; i++) {
            address memAddr = memberList[i];
            uint256 pct = getMemberPercentage(memAddr);
            if (pct > 0) {
                qualifiedMembers[idx] = memAddr;
                percentages[idx] = pct;
                uint256 cut = (currentBal * pct) / 100;
                amountsInWei[idx] = cut;
                totalReferralCuts += cut;
                idx++;
            }
        }

        organizerCutInWei = currentBal > totalReferralCuts ? currentBal - totalReferralCuts : 0;
        totalBalanceInWei = currentBal;
    }

    function getAllMembers() external view returns (Member[] memory) {
        uint256 count = memberList.length + 1;
        Member[] memory list = new Member[](count);

        Member memory adminMem = members[admin];
        uint256 adminPct = getMemberPercentage(admin);
        adminMem.isQualified = (adminPct > 0);
        adminMem.qualifiedPercentage = adminPct;
        list[0] = adminMem;

        for (uint256 i = 0; i < memberList.length; i++) {
            address u = memberList[i];
            Member memory m = members[u];
            uint256 pct = getMemberPercentage(u);
            m.isQualified = (pct > 0);
            m.qualifiedPercentage = pct;
            list[i + 1] = m;
        }

        return list;
    }

    function releaseFundsWithDynamicSplit() external onlyAdminOrManagerOrOrganizer nonReentrant {
        require(!isCompleted, "Funds already released");
        uint256 balanceToDistribute = address(this).balance;
        require(balanceToDistribute > 0, "No funds in campaign vault");

        uint256 totalReferralDistributed = 0;

        // 1. Admin Cut (3%)
        uint256 adminPct = getMemberPercentage(admin);
        if (adminPct > 0) {
            uint256 adminCut = (balanceToDistribute * adminPct) / 100;
            if (adminCut > 0) {
                totalReferralDistributed += adminCut;
                members[admin].earnedAmount += adminCut;
                (bool s1, ) = payable(admin).call{value: adminCut}("");
                require(s1, "Admin transfer failed");
            }
        }

        // 2. Member Cuts (Tier 1 = 5%, Tier 2 = 10%)
        for (uint256 i = 0; i < memberList.length; i++) {
            address memberAddr = memberList[i];
            uint256 pct = getMemberPercentage(memberAddr);
            if (pct > 0) {
                uint256 memberCut = (balanceToDistribute * pct) / 100;
                if (memberCut > 0 && address(this).balance >= memberCut) {
                    totalReferralDistributed += memberCut;
                    members[memberAddr].earnedAmount += memberCut;
                    (bool s2, ) = payable(memberAddr).call{value: memberCut}("");
                    require(s2, "Member transfer failed");
                }
            }
        }

        // 3. Organizer Net Cut
        uint256 remainingForOrganizer = address(this).balance;
        if (remainingForOrganizer > 0) {
            (bool s3, ) = payable(organizer).call{value: remainingForOrganizer}("");
            require(s3, "Organizer transfer failed");
        }

        isCompleted = true;
        isActive = false;

        emit FundsReleased(organizer, remainingForOrganizer, totalReferralDistributed, balanceToDistribute);
    }

    function deleteCampaign() external onlyAdminOrManagerOrOrganizer {
        require(totalCollected == 0 || isCompleted, "Cannot delete active funded campaign");
        isDeleted = true;
        isActive = false;
        emit CampaignDeleted(msg.sender);
    }

    function getSummary() external view returns (CampaignDetails memory) {
        return CampaignDetails({
            admin: admin,
            manager: manager,
            organizer: organizer,
            title: title,
            description: description,
            rootReferralCode: rootReferralCode,
            targetAmount: targetAmount,
            totalCollected: totalCollected,
            balance: address(this).balance,
            participantCount: participantCount,
            isCompleted: isCompleted,
            isDeleted: isDeleted,
            isActive: isActive,
            hubTokenAddress: address(hubToken)
        });
    }

    function setStatus(bool _status) external onlyAdminOrManagerOrOrganizer {
        isActive = _status;
        emit CampaignStatusUpdated(_status);
    }

    receive() external payable {
        joinCampaign(rootReferralCode);
    }
}

/**
 * @title CampaignFactory
 * @dev UUPS Upgradeable Factory for deploying campaigns & managing $HUB reward token minting.
 */
contract CampaignFactory is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    address public admin;
    address public manager;
    address[] public allCampaigns;
    HubToken public hubToken;

    mapping(string => address) public campaignByReferral;

    event CampaignCreated(
        address indexed campaignAddress,
        string referralCode,
        address indexed organizer,
        address managerAddress,
        address hubTokenAddress
    );
    event ManagerUpdated(address indexed newManager);
    event HubTokenUpdated(address indexed newHubToken);

    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == owner(), "Only Admin allowed");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _manager, address _hubToken) public initializer {
        __Ownable_init(msg.sender);

        admin = msg.sender;
        manager = _manager != address(0) ? _manager : msg.sender;
        hubToken = HubToken(_hubToken);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setHubToken(address _newHubToken) external onlyAdmin {
        require(_newHubToken != address(0), "Invalid token address");
        hubToken = HubToken(_newHubToken);
        emit HubTokenUpdated(_newHubToken);
    }

    function setManager(address _newManager) external onlyAdmin {
        require(_newManager != address(0), "Invalid manager address");
        manager = _newManager;
        emit ManagerUpdated(_newManager);
    }

    function createCampaign(
        string calldata _title,
        string calldata _description,
        string calldata _referralCode,
        uint256 _targetAmountInWei
    ) external returns (address) {
        require(campaignByReferral[_referralCode] == address(0), "Referral code already in use");

        Campaign newCampaign = new Campaign(
            admin,
            manager,
            msg.sender,
            address(hubToken),
            _title,
            _description,
            _referralCode,
            _targetAmountInWei
        );

        address campAddr = address(newCampaign);
        allCampaigns.push(campAddr);
        campaignByReferral[_referralCode] = campAddr;

        // Authorize new campaign to mint $HUB reward tokens
        if (address(hubToken) != address(0)) {
            try hubToken.setMinter(campAddr, true) {} catch {}
        }

        emit CampaignCreated(campAddr, _referralCode, msg.sender, manager, address(hubToken));
        return campAddr;
    }

    function getCampaignByReferral(string calldata _referralCode) external view returns (address) {
        return campaignByReferral[_referralCode];
    }

    function getAllCampaigns() external view returns (address[] memory) {
        return allCampaigns;
    }
}
