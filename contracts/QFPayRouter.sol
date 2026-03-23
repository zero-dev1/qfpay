// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract QFPayRouter {
    address public burnAddress;
    uint256 public burnBasisPoints;
    address public admin;
    
    event Payment(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 burned
    );
    
    constructor(address _burnAddress) {
        require(_burnAddress != address(0), "Invalid burn address");
        burnAddress = _burnAddress;
        burnBasisPoints = 10; // 0.1%
        admin = msg.sender;
    }
    
    receive() external payable {}
    
    function send(address to) external payable {
        require(to != address(0), "Invalid recipient");
        require(msg.value > 0, "No amount sent");
        
        uint256 burnAmount = (msg.value * burnBasisPoints) / 10000;
        uint256 recipientAmount = msg.value - burnAmount;
        
        require(recipientAmount > 0, "Amount too small after burn");
        
        // Send burn to burn address
        if (burnAmount > 0) {
            (bool success, ) = burnAddress.call{value: burnAmount}("");
            require(success, "Burn transfer failed");
        }
        
        // Send remainder to recipient
        if (recipientAmount > 0) {
            (bool success, ) = to.call{value: recipientAmount}("");
            require(success, "Recipient transfer failed");
        }
        
        emit Payment(msg.sender, to, msg.value, burnAmount);
    }
    
    // Admin functions
    function setBurnBasisPoints(uint256 newBps) external {
        require(msg.sender == admin, "Only admin");
        require(newBps <= 100, "Max 1% burn"); // Max 1%
        burnBasisPoints = newBps;
    }
    
    function setBurnAddress(address newBurn) external {
        require(msg.sender == admin, "Only admin");
        require(newBurn != address(0), "Invalid burn address");
        burnAddress = newBurn;
    }
    
    function setAdmin(address newAdmin) external {
        require(msg.sender == admin, "Only admin");
        admin = newAdmin;
    }
}
