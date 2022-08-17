// Enter the lotery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completly automate
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keeper)

// Dependencies
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/// @title A sample Lottery Contract
/// @author Martin Capovcak
/// @notice This contract is for creating an untamperable decentralized smart contract
/// @dev This implements Chainlink VRF v2 and Chainlink Keepers
contract Lottery is VRFConsumerBaseV2, KeeperCompatible {
    // Errors
    error Lottery__InsufficientEntranceFund();
    error Lottery__TransferFailed();
    error Lottery__NotOpen();
    error Lottery__UpkeepNotNeeded(
        uint256 _currentBalance,
        uint256 _numPlayers,
        uint256 _lotteryState
    );

    // Type
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    // State Variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery variables
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    // Events
    event LotteryEnter(address indexed _player);
    event RequestedLotteryWinner(uint256 indexed _requestId);
    event WinnerPicked(address indexed _winner);

    // Functions
    constructor(
        address _vrfCoordinatorV2, // contract
        uint256 _entranceFee,
        bytes32 _gasLane,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _interval
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        i_entranceFee = _entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_gasLane = _gasLane;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        s_lotteryState = LotteryState.OPEN; // opening lottery
        s_lastTimeStamp = block.timestamp;
        i_interval = _interval;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) revert Lottery__InsufficientEntranceFund();
        if (s_lotteryState != LotteryState.OPEN) revert Lottery__NotOpen();

        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    ///
    /// @dev This is the function that the Chainlink Keeper nodes call,
    /// they look for the "upkeepNeeded" to return true.
    /// The following shoild be true in order to return true:
    /// 1. The lottery should be in "open" state
    /// 2. Our time interval should be passed
    /// 3. The lottery should have at least 1 player, and have some ETH
    /// 4. Our subscription is funded with LINK
    ///
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (LotteryState.OPEN == s_lotteryState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(
        bytes memory /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }
        // Request the random number
        // Once we get it, do something with it
        // 2 transaction process
        s_lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // keyHash
            i_subscriptionId, // s_subscriptionId
            REQUEST_CONFIRMATIONS, //requestConfirmations
            i_callbackGasLimit, // i_callbackGasLimit
            NUM_WORDS //numWords
        );

        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /*_requestId*/
        uint256[] memory _randomWords
    ) internal override {
        // _randomWords is an array of random numbers
        uint256 indexOfWinner = _randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_players = new address payable[](0); // reset players
        s_lotteryState = LotteryState.OPEN; // open lotery
        s_lastTimeStamp = block.timestamp; // reset timestamp
        // Send money to winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        // require
        if (!success) {
            revert Lottery__TransferFailed();
        }

        emit WinnerPicked(recentWinner);
    }

    // Getters
    // View / Pure functions
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 _index) public view returns (address) {
        return s_players[_index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimestamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
