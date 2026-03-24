// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QFPayRouter
 * @notice Routes payments on QF Network with a 0.1% burn mechanic.
 *         The recipient receives the exact intended amount; the burn is paid
 *         ON TOP by the sender.  msg.value must equal intendedAmount + burn.
 *
 * Burn calculation:
 *   burn = (intendedAmount * burnBasisPoints) / 10000
 *   required msg.value = intendedAmount + burn
 */
contract QFPayRouter {
    address public burnAddress;
    uint256 public burnBasisPoints; // default 10 = 0.1%
    address public admin;

    event Payment(
        address indexed from,
        address indexed to,
        uint256 intendedAmount,
        uint256 burned
    );

    constructor(address _burnAddress) {
        require(_burnAddress != address(0), "Burn address cannot be zero");
        burnAddress = _burnAddress;
        burnBasisPoints = 10; // 0.1%
        admin = msg.sender;
    }

    /**
     * @notice Send QF to a recipient. Recipient receives exactly `intendedAmount`.
     *         Caller must send intendedAmount + burn as msg.value.
     * @param to          The recipient address
     * @param intendedAmount  The exact amount the recipient will receive
     */
    function send(address to, uint256 intendedAmount) external payable {
        require(to != address(0), "Cannot send to zero address");
        require(intendedAmount > 0, "Amount must be greater than zero");

        uint256 burn = (intendedAmount * burnBasisPoints) / 10000;
        uint256 requiredValue = intendedAmount + burn;
        require(msg.value == requiredValue, "Incorrect msg.value: must equal intendedAmount + burn");

        // Send exact intended amount to recipient
        (bool sentToRecipient, ) = payable(to).call{value: intendedAmount}("");
        require(sentToRecipient, "Transfer to recipient failed");

        // Send burn
        if (burn > 0) {
            (bool sentBurn, ) = payable(burnAddress).call{value: burn}("");
            require(sentBurn, "Burn transfer failed");
        }

        emit Payment(msg.sender, to, intendedAmount, burn);
    }

    // --- Admin functions ---

    function setBurnBasisPoints(uint256 _bps) external {
        require(msg.sender == admin, "Only admin");
        require(_bps <= 100, "Max 1%");
        burnBasisPoints = _bps;
    }

    function setBurnAddress(address _addr) external {
        require(msg.sender == admin, "Only admin");
        require(_addr != address(0), "Cannot set zero address");
        burnAddress = _addr;
    }

    function setAdmin(address _newAdmin) external {
        require(msg.sender == admin, "Only admin");
        require(_newAdmin != address(0), "Cannot set zero address");
        admin = _newAdmin;
    }

    receive() external payable {}
}
