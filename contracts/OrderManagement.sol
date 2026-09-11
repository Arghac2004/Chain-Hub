// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserManagement.sol";

interface IERC20Token {
    function mintTokens(address receipient, uint256 tokenAmount) external returns (bool);
    function transfer(address _to, uint256 _value) external returns (bool success);
    function balanceOf(address user) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function decimals() external view returns (uint8);
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract OrderManagement is UserManagement {
    AggregatorV3Interface internal priceFeed;

    IERC20Token public asset1; // Token 1 (e.g. HUB Token)
    IERC20Token public asset2; // Token 2 (e.g. USDT Token)
    IERC20Token public asset3;

    struct Order {
        uint256 orderID;
        uint256 pair; // 0 = ETH, 1 = Token1, 2 = Token2
        uint256 totalQuantity;
        uint256 min;
        uint256 max;
        uint256 status; // 8 = Pending/Active, 1 = Expired/Completed
        uint256 price;
        address userAddress;
        uint256 creationTime;
        uint256 _type; // 0 = Sell, 1 = Buy
        uint256 country;
        bool buyStatus;
    }

    struct BuyOrder {
        uint256 buyOrderID;
        uint256 mainOrderID;
        uint256 amount;
        uint256 pair;
        uint256 status; // 5 = InProcess, 7 = Paid, 6 = Finished, 2 = Dispute, 4 = Cancelled
        uint256 createtime;
        uint256 expiretime;
        uint256 price;
        string bankTransferCode;
        address userAddress;
        address seller;
        uint256 completedTime;
    }

    bool public isStarted;
    address public creator;
    address public masterContract;
    uint256 public totalOrders;
    uint256 public p2pExpireTime;
    uint256 public totalBuyOrders;
    string[20] public assetType;

    // Country => pair => orders
    mapping(uint256 => mapping(uint256 => uint256[])) public allOrders;
    // Country => pair => key => orders
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256[]))) public allOrdersPriceWise;
    mapping(uint256 => Order) public orderInfo;
    mapping(uint256 => BuyOrder) public buyOrderInfo;
    mapping(uint256 => uint256[]) public buyOrdersAgainestOrder;
    mapping(uint256 => uint256[]) public keys;
    mapping(string => uint256) public usdToLocal;

    uint256 public priceGappingper;
    uint256 public baseDiveder;

    function createOrder(
        uint256 _totalQuantity,
        uint256 _min,
        uint256 _max,
        uint256 _price,
        uint256 _pairIndex,
        uint256 _type,
        string memory _local
    ) external payable {
        require(users[msg.sender].kycStatus == true, "Please Complete KYC first");
        
        totalOrders++;
        Order storage order = orderInfo[totalOrders];

        if (_type == 0) {
            // Sell Order: Lock Crypto into Contract Escrow
            if (_pairIndex == 0) {
                // ETH Native
                require(msg.value >= _totalQuantity, "ETH funds do not match");
            } else if (_pairIndex == 1) {
                require(address(asset1) != address(0), "Token1 not set");
                require(asset1.balanceOf(msg.sender) >= _totalQuantity, "Token1 balance insufficient");
                require(asset1.transferFrom(msg.sender, address(this), _totalQuantity), "Token1 transfer failed");
            } else if (_pairIndex == 2) {
                require(address(asset2) != address(0), "Token2 not set");
                require(asset2.balanceOf(msg.sender) >= _totalQuantity, "Token2 balance insufficient");
                require(asset2.transferFrom(msg.sender, address(this), _totalQuantity), "Token2 transfer failed");
            }
            order.buyStatus = true;
        }

        order.orderID = totalOrders;
        order.pair = _pairIndex;
        order.totalQuantity = _totalQuantity;
        order.min = _min;
        order.max = _max;
        order.status = 8; // 8 = Pending/Active
        order.price = _price;
        order.userAddress = msg.sender;
        order.country = users[msg.sender].country;
        order.creationTime = block.timestamp;
        order._type = _type;

        allOrders[users[msg.sender].country][_pairIndex].push(totalOrders);
        setUsercreateOrders(msg.sender, totalOrders);
        setUserLog(msg.sender, _totalQuantity, "Create Sell Order", block.timestamp, 0);
    }

    function buyOrder(uint256 _orderId, uint256 _amount, string memory code) public {
        buyOrderInternal(msg.sender, _orderId, _amount, code);
    }

    function buyOrderInternal(
        address _user,
        uint256 _orderId,
        uint256 _amount,
        string memory code
    ) internal {
        require(users[_user].kycStatus == true, "Please Complete KYC first");

        Order storage order = orderInfo[_orderId];
        require(_user != order.userAddress, "Seller cannot buy own order");
        require(order.buyStatus == true, "Order not available for buying");
        require(order.totalQuantity >= _amount, "Insufficient order quantity");
        require(order.min <= _amount, "Amount is below minimum limit");
        require(order.max >= _amount, "Amount exceeds maximum limit");
        require(order.status == 8, "Order is not active");

        totalBuyOrders++;
        uint256 order_id = totalBuyOrders;
        BuyOrder storage b_order = buyOrderInfo[order_id];

        b_order.buyOrderID = order_id;
        b_order.mainOrderID = _orderId;
        b_order.amount = _amount;
        b_order.pair = order.pair;
        b_order.createtime = block.timestamp;
        b_order.userAddress = _user;
        b_order.expiretime = block.timestamp + p2pExpireTime;
        b_order.status = 5; // 5 = In Process
        b_order.bankTransferCode = code;
        b_order.seller = order.userAddress;
        b_order.price = order.price;
        b_order.completedTime = 0;

        order.totalQuantity = order.totalQuantity - _amount;

        if (order.totalQuantity == 0 || order.totalQuantity < order.min) {
            order.status = 1; // Completed / Expired
        }

        setUserOrders(_user, order_id);
        setUserOrders(order.userAddress, order_id);
        buyOrdersAgainestOrder[_orderId].push(order_id);
    }

    function confirmPayment(uint256 _buyOrderId) public {
        BuyOrder storage b_order = buyOrderInfo[_buyOrderId];
        require(users[msg.sender].kycStatus == true, "Please Complete KYC first");
        require(msg.sender == b_order.userAddress, "Only Buyer can confirm payment");
        require(b_order.status == 5, "Order is not in process");
        require(b_order.expiretime >= block.timestamp, "Order time expired");
        b_order.status = 7; // 7 = Payment Success (Buyer marked Paid)
    }

    function cancelOrder(uint256 _buyOrderId) public {
        BuyOrder storage b_order = buyOrderInfo[_buyOrderId];
        Order storage order = orderInfo[b_order.mainOrderID];
        require(users[msg.sender].kycStatus == true, "Please Complete KYC first");
        require(
            msg.sender == b_order.userAddress || msg.sender == b_order.seller,
            "No permission to cancel"
        );
        require(b_order.status == 5, "Cannot cancel this order");

        order.totalQuantity = order.totalQuantity + b_order.amount;
        order.status = 8;
        b_order.status = 4; // 4 = Cancelled
    }

    function releaseFunds(uint256 _buyorderId) external {
        BuyOrder storage b_order = buyOrderInfo[_buyorderId];
        Order storage order = orderInfo[b_order.mainOrderID];

        require(b_order.status == 7, "Buyer has not confirmed payment");
        require(msg.sender == order.userAddress, "Only Seller can release funds");

        uint256 decimalType = 18;

        if (order.pair == 0) {
            // ETH Native Release
            require(address(this).balance >= b_order.amount, "Insufficient ETH in escrow");
            payable(b_order.userAddress).transfer(b_order.amount);
            decimalType = 18;
        } else if (order.pair == 1) {
            // Token1 Release
            require(asset1.balanceOf(address(this)) >= b_order.amount, "Insufficient Token1 in escrow");
            require(asset1.transfer(b_order.userAddress, b_order.amount), "Token1 transfer failed");
            decimalType = asset1.decimals();
        } else if (order.pair == 2) {
            // Token2 Release
            require(asset2.balanceOf(address(this)) >= b_order.amount, "Insufficient Token2 in escrow");
            require(asset2.transfer(b_order.userAddress, b_order.amount), "Token2 transfer failed");
            decimalType = asset2.decimals();
        }

        b_order.status = 6; // 6 = Finished
        b_order.completedTime = block.timestamp;
        setUserLog(b_order.userAddress, b_order.amount, "Release Funds", block.timestamp, decimalType);
    }

    function getAllOrdersLength(uint256 country, uint256 pair) public view returns (uint256 count) {
        count = allOrders[country][pair].length;
    }

    function getAllOrders(
        uint256 country,
        uint256 pair,
        uint256 index
    ) public view returns (uint256 id) {
        id = allOrders[country][pair][index];
    }

    function getLatestPrice() public view returns (int256) {
        if (address(priceFeed) == address(0)) {
            return 3000 * 1e8; // Fallback: $3000 / ETH
        }
        try priceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256,
            uint80
        ) {
            return price > 0 ? price : int256(3000 * 1e8);
        } catch {
            return 3000 * 1e8;
        }
    }

    function TotalusdPrice(int256 _amount) public view returns (int256) {
        int256 ethUsd = getLatestPrice();
        return (ethUsd * _amount) / 1e18;
    }
}
