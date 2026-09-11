// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UserManagement {
    struct User {
        uint256[] createOrders;
        uint256[] orders;
        string kycID;
        uint256 country;
        address kycApproveadmin;
        bool kycStatus;
    }

    struct UserLog {
        uint256 amount;
        uint256 decimalType;
        string action;
        uint256 time;
    }

    mapping(address => User) public users;
    mapping(address => UserLog[]) public userlogInfo;
    mapping(uint256 => address) public userAddressbyKycID;

    function setUserDetails(
        address _user,
        string memory _kycid,
        uint256 _countryId,
        address admin
    ) internal {
        users[_user].kycID = _kycid;
        users[_user].country = _countryId;
        users[_user].kycApproveadmin = admin;
        users[_user].kycStatus = true;
    }

    function setUsercreateOrders(address _user, uint256 _orderID) internal {
        users[_user].createOrders.push(_orderID);
    }

    function setUserOrders(address _user, uint256 _orderID) internal {
        users[_user].orders.push(_orderID);
    }

    function getUserData(address _user)
        public
        view
        returns (
            uint256 _countryID,
            bool _kycStatus,
            string memory _kycID,
            uint256 _ordersLength,
            uint256 _createordersLength
        )
    {
        _countryID = users[_user].country;
        _kycStatus = users[_user].kycStatus;
        _kycID = users[_user].kycID;
        _ordersLength = users[_user].orders.length;
        _createordersLength = users[_user].createOrders.length;
    }

    function getcreateOrderIDs(address _user, uint256 _index) public view returns (uint256 id) {
        id = users[_user].createOrders[_index];
    }

    function getOrderIDs(address _user, uint256 _index) public view returns (uint256 id) {
        id = users[_user].orders[_index];
    }

    function setUserLog(
        address _user,
        uint256 _amount,
        string memory _action,
        uint256 _time,
        uint256 _decimalType
    ) internal {
        userlogInfo[_user].push(UserLog(_amount, _decimalType, _action, _time));
    }

    function getUserlogLength(address _user) public view returns (uint256 _count) {
        _count = userlogInfo[_user].length;
    }

    function getUserLogData(address _user, uint256 i)
        public
        view
        returns (
            uint256 _amount,
            uint256 _time,
            string memory _action,
            uint256 _decimalType
        )
    {
        _amount = userlogInfo[_user][i].amount;
        _time = userlogInfo[_user][i].time;
        _action = userlogInfo[_user][i].action;
        _decimalType = userlogInfo[_user][i].decimalType;
    }
}
