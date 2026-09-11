// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OrderManagement.sol";

contract SepoliaP2PEscrow is OrderManagement {
    struct Dispute {
        uint256 mainOrderId;
        uint256 buyOrderId;
        string reason;
        address approvedAdmin;
        uint256 status; // 2 = Open, 4 = Refunded Seller, 6 = Refunded Buyer
    }

    uint256 public totalDispute;
    uint256[] public disputes;
    address public admin;

    modifier onlyOwner() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    mapping(uint256 => Dispute) public disputeinfo;

    constructor() {
        admin = msg.sender;
        creator = msg.sender;
        assetType[0] = "ETH";
        assetType[1] = "HUB";
        assetType[2] = "USDT";
        
        // Chainlink Sepolia ETH/USD Price Feed Address
        priceFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);

        usdToLocal["INR"] = 8300000000;
        usdToLocal["USD"] = 1e8;
        usdToLocal["VN"] = 2450000000000;
        usdToLocal["PHI"] = 5600000000;

        p2pExpireTime = 2 hours;
        priceGappingper = 50;
        baseDiveder = 1000;
        isStarted = true;

        // Auto-approve deployer KYC
        setUserDetails(msg.sender, "ADMIN_KYC", 1, msg.sender);
    }
// admin update function 
    function start(
        address _creator,
        address _admin,
        IERC20Token _token1,
        IERC20Token _token2,
        IERC20Token _token3,
        address _masterContract
    ) public onlyOwner {
        creator = _creator;
        admin = _admin;
        asset1 = _token1;
        asset2 = _token2;
        asset3 = _token3;
        masterContract = _masterContract;
    }

    function setTokens(IERC20Token _token1, IERC20Token _token2) external onlyOwner {
        asset1 = _token1;
        asset2 = _token2;
    }

    function setUser(
        address _user,
        string memory _kycid,
        uint256 _countryId
    ) public onlyOwner {
        setUserDetails(_user, _kycid, _countryId, msg.sender);
    }

    function raiseDispute(uint256 buyOrderId, string memory _reason) public {
        require(users[msg.sender].kycStatus == true, "Please Complete KYC first");
        require(buyOrderInfo[buyOrderId].status == 7 || buyOrderInfo[buyOrderId].status == 5, "Order cannot be disputed");
        require(
            msg.sender == buyOrderInfo[buyOrderId].userAddress ||
                msg.sender == buyOrderInfo[buyOrderId].seller,
            "No permission to dispute"
        );

        totalDispute++;
        uint256 id = totalDispute;
        disputeinfo[id].buyOrderId = buyOrderId;
        disputeinfo[id].mainOrderId = buyOrderInfo[buyOrderId].mainOrderID;
        disputeinfo[id].reason = _reason;
        disputeinfo[id].status = 2; // 2 = Open Dispute
        buyOrderInfo[buyOrderId].status = 2;
        disputes.push(id);
    }

    function getDisputeids(uint256 index) public view returns (uint256 _count) {
        _count = disputes[index];
    }

    function refundToseller(uint256 disputeId) public onlyOwner {
        require(buyOrderInfo[disputeinfo[disputeId].buyOrderId].status == 2, "Dispute is not Open");
        disputeinfo[disputeId].status = 4;
        disputeinfo[disputeId].approvedAdmin = msg.sender;
        buyOrderInfo[disputeinfo[disputeId].buyOrderId].status = 4;

        orderInfo[disputeinfo[disputeId].mainOrderId].totalQuantity =
            orderInfo[disputeinfo[disputeId].mainOrderId].totalQuantity +
            buyOrderInfo[disputeinfo[disputeId].buyOrderId].amount;
        orderInfo[disputeinfo[disputeId].mainOrderId].status = 8;
    }

    function refundToBuyer(uint256 disputeId) public onlyOwner {
        require(buyOrderInfo[disputeinfo[disputeId].buyOrderId].status == 2, "Dispute is not Open");
        Order storage order = orderInfo[disputeinfo[disputeId].mainOrderId];
        BuyOrder storage b_order = buyOrderInfo[disputeinfo[disputeId].buyOrderId];

        if (order.pair == 0) {
            require(address(this).balance >= b_order.amount, "Insufficient ETH in contract");
            payable(b_order.userAddress).transfer(b_order.amount);
        } else if (order.pair == 1) {
            require(asset1.balanceOf(address(this)) >= b_order.amount, "Insufficient Token1 in contract");
            require(asset1.transfer(b_order.userAddress, b_order.amount), "Token1 transfer failed");
        } else if (order.pair == 2) {
            require(asset2.balanceOf(address(this)) >= b_order.amount, "Insufficient Token2 in contract");
            require(asset2.transfer(b_order.userAddress, b_order.amount), "Token2 transfer failed");
        }

        disputeinfo[disputeId].approvedAdmin = msg.sender;
        disputeinfo[disputeId].status = 6;
        b_order.status = 6;
    }

    function emergencyWithdrawEth() external onlyOwner {
        payable(admin).transfer(address(this).balance);
    }

    receive() external payable {}
}
