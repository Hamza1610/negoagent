// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Negotiation
 * @notice Protocol-level bilateral negotiation and settlement contract for autonomous AI agents on Monad.
 * @dev Enforces state machine transitions, alternating turns, and deadline validation between counterparties.
 */
contract Negotiation {
    enum Status {
        Created,
        Active,
        Accepted,
        Settled,
        Rejected,
        Expired
    }

    struct NegotiationData {
        uint256 id;
        address buyer;
        address seller;
        uint256 buyerAgentId;
        uint256 sellerAgentId;
        uint256 referencePrice;
        uint256 currentOffer;
        address lastOfferer;
        uint8 round;
        uint256 deadline;
        Status status;
        string itemDescription;
    }

    uint256 public nextNegotiationId = 1;
    mapping(uint256 => NegotiationData) public negotiations;

    event NegotiationOpened(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 buyerAgentId,
        uint256 sellerAgentId,
        uint256 referencePrice,
        uint256 deadline,
        string itemDescription
    );

    event OfferSubmitted(
        uint256 indexed id,
        uint8 indexed round,
        address indexed offerer,
        uint256 amount
    );

    event OfferAccepted(
        uint256 indexed id,
        address indexed acceptedBy,
        uint256 finalPrice
    );

    event NegotiationSettled(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 settledPrice
    );

    event NegotiationRejected(
        uint256 indexed id,
        address indexed rejectedBy
    );

    modifier onlyParticipant(uint256 _id) {
        NegotiationData storage neg = negotiations[_id];
        require(msg.sender == neg.buyer || msg.sender == neg.seller, "Not negotiation participant");
        _;
    }

    modifier notExpired(uint256 _id) {
        NegotiationData storage neg = negotiations[_id];
        if (block.timestamp > neg.deadline && neg.status != Status.Settled) {
            neg.status = Status.Expired;
            revert("Negotiation expired");
        }
        _;
    }

    /**
     * @notice Opens a new negotiation session between buyer and seller.
     */
    function openNegotiation(
        address _seller,
        uint256 _buyerAgentId,
        uint256 _sellerAgentId,
        uint256 _referencePrice,
        uint256 _duration,
        string calldata _itemDescription
    ) external returns (uint256) {
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer cannot be seller");
        require(_referencePrice > 0, "Reference price must be > 0");
        require(_duration > 0, "Duration must be > 0");

        uint256 id = nextNegotiationId++;
        uint256 deadline = block.timestamp + _duration;

        negotiations[id] = NegotiationData({
            id: id,
            buyer: msg.sender,
            seller: _seller,
            buyerAgentId: _buyerAgentId,
            sellerAgentId: _sellerAgentId,
            referencePrice: _referencePrice,
            currentOffer: 0,
            lastOfferer: address(0),
            round: 0,
            deadline: deadline,
            status: Status.Created,
            itemDescription: _itemDescription
        });

        emit NegotiationOpened(
            id,
            msg.sender,
            _seller,
            _buyerAgentId,
            _sellerAgentId,
            _referencePrice,
            deadline,
            _itemDescription
        );

        return id;
    }

    /**
     * @notice Submits a new offer or counter-offer.
     * Enforces alternating bargaining turns between counterparties.
     */
    function makeOffer(uint256 _id, uint256 _offerAmount)
        external
        onlyParticipant(_id)
        notExpired(_id)
    {
        NegotiationData storage neg = negotiations[_id];
        require(
            neg.status == Status.Created || neg.status == Status.Active,
            "Negotiation not active"
        );
        require(msg.sender != neg.lastOfferer, "Wait for counterparty response");
        require(_offerAmount > 0, "Offer amount must be > 0");

        neg.currentOffer = _offerAmount;
        neg.lastOfferer = msg.sender;
        neg.round += 1;
        neg.status = Status.Active;

        emit OfferSubmitted(_id, neg.round, msg.sender, _offerAmount);
    }

    /**
     * @notice Accepts the counterparty's active offer and transitions to Settled.
     */
    function acceptOffer(uint256 _id)
        external
        onlyParticipant(_id)
        notExpired(_id)
    {
        NegotiationData storage neg = negotiations[_id];
        require(neg.status == Status.Active, "No active offer to accept");
        require(msg.sender != neg.lastOfferer, "Cannot accept your own offer");

        neg.status = Status.Settled;

        emit OfferAccepted(_id, msg.sender, neg.currentOffer);
        emit NegotiationSettled(_id, neg.buyer, neg.seller, neg.currentOffer);
    }

    /**
     * @notice Rejects the active offer and terminates negotiation.
     */
    function rejectOffer(uint256 _id)
        external
        onlyParticipant(_id)
        notExpired(_id)
    {
        NegotiationData storage neg = negotiations[_id];
        require(
            neg.status == Status.Created || neg.status == Status.Active,
            "Cannot reject non-active negotiation"
        );
        require(msg.sender != neg.lastOfferer, "Cannot reject own action");

        neg.status = Status.Rejected;

        emit NegotiationRejected(_id, msg.sender);
    }

    /**
     * @notice Retrieves the full negotiation state.
     */
    function getNegotiation(uint256 _id)
        external
        view
        returns (
            uint256 id,
            address buyer,
            address seller,
            uint256 buyerAgentId,
            uint256 sellerAgentId,
            uint256 referencePrice,
            uint256 currentOffer,
            address lastOfferer,
            uint8 round,
            uint256 deadline,
            Status status,
            string memory itemDescription
        )
    {
        NegotiationData storage neg = negotiations[_id];
        require(neg.id != 0, "Negotiation does not exist");
        return (
            neg.id,
            neg.buyer,
            neg.seller,
            neg.buyerAgentId,
            neg.sellerAgentId,
            neg.referencePrice,
            neg.currentOffer,
            neg.lastOfferer,
            neg.round,
            neg.deadline,
            neg.status,
            neg.itemDescription
        );
    }
}
