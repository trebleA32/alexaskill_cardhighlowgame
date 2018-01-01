'use strict';
var Alexa = require("alexa-sdk");

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = 'appID';
    alexa.dynamoDBTableName = 'cardHighLowGuessUsers';  // Save attribute data to DynamoDB
    alexa.registerHandlers(newSessionHandlers, guessModeHandlers, newGameHandlers, continueGameHandlers, pauseModeHandlers);
    alexa.execute();
};

var states = {
    GUESSMODE: '_GUESSMODE', // User is trying to guess if the next card will be higher or lower.
    NEWGAMEMODE: '_NEWGAMEMODE',  // User  has been prompted to start a game.
    CONTINUEMODE: '_CONTINUEMODE', // User has been prompted to continue a game or start a new one
    PAUSEMODE: '_PAUSEMODE' // User has exited the skill
};

var guessHigh = ['higher', 'high', 'bigger', 'big', 'more', 'greater', 'great'];

var guessLow = ['lower', 'low', 'lesser', 'less', 'smaller', 'small'];

var guessEqual = ['equal', 'same', 'similar', 'equivalent'];

var welcomeMessage = 'Welcome to the Playing Card Higher or Lower guessing game. ';

var newGamePrompt = 'Say yes to start a new game or no to quit. ';

var playAgainPrompt = 'Would you like to play another game? ';

var helpMessage = 'I will say a playing card and you will guess whether the value of the next card will be higher, equal, or lower. ' + 
     'Each card is drawn without replacement from a deck of 52 cards.  Aces are the highest cards and Twos are the lowest cards. ' + 
     'You keep guessing until you guess incorrectly or run out of cards. To reset your high scores and current game at any point just say reset data. ';

var goodbyeMessage = 'Goodbye! ';

var continuePrompt = 'Would you like to continue playing your current game, start a new one, or exit?';

var guessPrompt = 'Guess whether the value of the next card will be higher, equal, or lower. ';

var congratsMessage = 'Congratulations!  You beat the game and there are no more cards. ';

var correctMessage = 'Correct! ';

var incorrectMessage = 'Incorrect! ';

var unhandledMessage = 'I\'m sorry I didn\'t get that. ';

var newGameMessage = 'Starting new game. ';

var continueMessage = 'Continuing game. ';

var noContinueMessage = 'There is no saved game to continue. ';

var clearDataMessage = 'Data cleared. ';

var newSessionHandlers = { // This should only matter if its the first time the skill has been launched
    'LaunchRequest': function() {
	helper.defineAttributes(this);

	var message = welcomeMessage + helper.stringHighScore(this);
	if(this.attributes.currentStreak !== undefined) // If there is a previous game that can be continued
	{
	    message += helper.stringScore(this, 'current');
	    message += continuePrompt;
            this.handler.state = states.CONTINUEMODE;
	}
	else // Otherwise ask user to start new game
	{
            this.handler.state = states.NEWGAMEMODE;
	    message += newGamePrompt;
	}
        this.emit(':ask', message, message);
    },
    'ClearData': function() {
        console.log('CLEARDATA');
        this.handler.state = states.NEWGAMEMODE;
        this.attributes.gamesPlayed = undefined;
        helper.defineAttributes(this);
        var message =  clearDataMessage + newGamePrompt;
        this.emit(':ask', message);
    },
    'AMAZON.ResumeIntent': function()
    {
        helper.defineAttributes(this);
        var message = noContinueMessage + newGamePrompt;
        
        this.handler.state = states.NEWGAMEMODE;
        this.emit(':ask', message, message);
    },
    'AMAZON.StartOverIntent': function() 
    {
        helper.defineAttributes(this);
        helper.startOver(this);
    },
    'NewGameIntent': function()
    {   
        helper.defineAttributes(this);
        helper.startOver(this);
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        this.emit('LaunchRequest');
    }
};

var pauseModeHandlers = Alexa.CreateStateHandler(states.PAUSEMODE,
{
    'LaunchRequest': function() 
    {
        var message = welcomeMessage + helper.stringHighScore(this);
        if(this.attributes.currentStreak == undefined) // If there is no game to be continued
        {
            message += newGamePrompt;
            this.handler.state = states.NEWGAMEMODE;
        }
        else // If there is a game to be continued
        {
            message = message + helper.stringScore(this, 'current') + continuePrompt;
            this.handler.state = states.CONTINUEMODE;    
        }
        this.emit(':ask', message, message);
    },
    'AMAZON.ResumeIntent': function() 
    {
        if(this.attributes.currentStreak == undefined) // If there is no game to be continued
        {
            this.handler.state = states.NEWGAMEMODE;
        }
        else // If there is a game to be continued
        {
            this.handler.state = states.CONTINUEMODE;
        }
        this.emitWithState('AMAZON.ResumeIntent');
    },
    'NewGameIntent': function()
    {
        this.handler.state = states.NEWGAMEMODE;
        this.emitWithState('NewGameIntent');
    },
    'AMAZON.StartOverIntent': function()
    {
        this.handler.state = states.CONTINUEMODE;
        this.emitWithState('AMAZON.StartOverIntent');
    },
    'ClearData': function() {
        this.handler.state = undefined;
        this.emit('ClearData');
    },
    'Unhandled': function()
    {
        var message = unhandledMessage;
        if(this.attributes.currentStreak == undefined) // If there is no game to be continued
        {
            this.handler.state = states.NEWGAMEMODE;
            message += newGamePrompt;
        }
        else // If there is a game to be continued
        {
            this.handler.state = states.CONTINUEMODE;
            message = message + helper.stringScore(this, 'current') + continuePrompt;
            this.emit(':ask', message, message);
        }
    }
});

var continueGameHandlers = Alexa.CreateStateHandler(states.CONTINUEMODE, 
{
    'AMAZON.ResumeIntent': function ()
    {
        helper.continueGame(this, continueMessage);
    },
    'AMAZON.RepeatIntent': function()
    {
        var message = helper.stringScore(this, 'current') + continuePrompt;
        this.emit(':ask', message, message);
    },
    'AMAZON.HelpIntent': function() 
    {
        var message = helpMessage + continuePrompt;
        this.emit(':ask', message, message);
    },
    'NewGameIntent': function()
    {
        helper.startOver(this);
    },
    'AMAZON.StartOverIntent': function ()
    {
        helper.startOver(this);
    },
    'AMAZON.NoIntent': function() 
    {
        console.log("NOINTENT");
        helper.exitHelper(this);
    },
    "AMAZON.StopIntent": function() 
    {
        console.log("STOPINTENT");
        helper.exitHelper(this);
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
        helper.exitHelper(this);
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        helper.exitHelper(this);
    },
    'ClearData': function() {
        this.handler.state = undefined;
        this.emit('ClearData');
    },
    'Unhandled': function() {
        console.log("UNHANDLED_C");
        var message = unhandledMessage + continuePrompt;
        this.emit(':ask', message, message);
    }
});

var newGameHandlers = Alexa.CreateStateHandler(states.NEWGAMEMODE, {
    'LaunchRequest': function()
    {
        helper.startNewGame(this);
    },
    'AMAZON.ResumeIntent': function()
    {
        var message = noContinueMessage + newGamePrompt;
        this.emit(':ask', message, message);
    },
    'AMAZON.YesIntent': function() 
    {  // Start a new game
        helper.startNewGame(this);
    },
    'AMAZON.StartOverIntent': function ()
    {
        helper.startNewGame(this);
    },
    'NewGameIntent': function ()
    { 
        helper.startNewGame(this);
    },
    'AMAZON.NoIntent': function() 
    {
        console.log("NOINTENT");
        helper.exitHelper(this);
    },
    'AMAZON.RepeatIntent': function()
    {
        this.emit(':ask', newGamePrompt, newGamePrompt);
    },
    'AMAZON.HelpIntent': function() 
    {
        var message = helpMessage + newGamePrompt;
        this.emit(':ask', message, message);
    },
    "AMAZON.StopIntent": function() 
    {
        console.log("STOPINTENT");
        helper.exitHelper(this);
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
        helper.exitHelper(this);
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        helper.exitHelper(this);
    },
    'ClearData': function() {
        this.emit('ClearData');
    },
    'Unhandled': function() {
        console.log("UNHANDLED_NG");
        var message = unhandledMessage + newGamePrompt;
        this.emit(':ask', message, message);
    }
});

var guessModeHandlers = Alexa.CreateStateHandler(states.GUESSMODE, {
    'CardGuess': function() {
        if(!this.event.request.intent || !this.event.request.intent.slots || !this.event.request.intent.slots.Guess)
        {
            this.emitWithState('Unhandled');
        }
        
        for(var i = 0; i < guessHigh.length; i++)
        {
            if(this.event.request.intent.slots.Guess.value == guessHigh[i])
            {
                helper.cardGuessHelper(this, 1);
                return;
            }
        }
        for(var i = 0; i < guessLow.length; i++)
        {
            if(this.event.request.intent.slots.Guess.value == guessLow[i])
            {
                helper.cardGuessHelper(this, -1);
                return;
            }
        }
        for(var i = 0; i < guessEqual.length; i++)
        {
            if(this.event.request.intent.slots.Guess.value == guessEqual[i])
            {
                helper.cardGuessHelper(this, 0);
                return;
            }
        }
        this.emitWithState('Unhandled');    
    },
    'NewGameIntent': function()
    {
        helper.startOver(this);
    },
    'AMAZON.RepeatIntent': function()
    {
        var message = helper.stringCurrentCard(this) + guessPrompt;
        this.emit(':ask', message, message);
    }, 
    'AMAZON.StartOverIntent': function ()
    {
        helper.startOver(this);
    },
    'AMAZON.HelpIntent': function() {
        var message = helpMessage + helper.stringCurrentCard(this) + guessPrompt;
        this.emit(':tell', message, message);
    },
    "AMAZON.StopIntent": function() 
    {
        console.log("STOPINTENT");
        helper.exitHelper(this); 
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
        helper.exitHelper(this);
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        helper.exitHelper(this);
    },
    'ClearData': function() {
        this.handler.state = undefined;
        this.emit('ClearData');
    },
    'Unhandled': function() {
        var message = unhandledMessage + helper.stringCurrentCard(this) + guessPrompt;
        console.log("UNHANDLED_G");
        this.emit(':ask', message, message);
    }
});

// Helper functions
var helper = {
    
    defineAttributes: function(context)
    {
        if(context.attributes.gamesPlayed === undefined) { // Check if its the first time the skill has been launched, just to be sure
            context.attributes.gamesPlayed = 0;
            context.attributes.currentStreak = undefined;
	    context.attributes.currentScore = 0;

	    context.attributes.cardArray = new Array(52);
            for(var i = 0; i < 52; i++)
            {
                context.attributes.cardArray[i] = i;
            }

	    context.attributes.highStreakScore = 0;
	    context.attributes.highStreakStreak = 0;
            context.attributes.highScoreScore = 0;
            context.attributes.highScoreStreak = 0;
        }
    },
    startOver: function(context)
    {
        helper.gameOver(context);
        helper.startNewGame(context);
    },
    exitHelperContinue: function(context)
    {
        context.handler.state = states.CONTINUEMODE;
        helper.exitHelper(context);
    },
    exitHelper: function(context)
    {
        context.handler.state = states.PAUSEMODE;
        helper.testNewHighScore(context);
        context.emit(':tell', goodbyeMessage, goodbyeMessage);
    },
    startNewGame: function(context) // Sets up a new game
    {
        context.attributes.gamesPlayed++; // Keep track of how many games played
        context.attributes.currentStreak = 0; // Need to draw new card for zero slot
        helper.drawRandomCard(context, context.attributes.currentStreak); // draw random card for current slot;        
        helper.continueGame(context, newGameMessage);
    },
    continueGame: function(context, imessage) // Continues where the game left off
    {
        context.handler.state = states.GUESSMODE;
        var message = helper.stringCurrentCard(context) + guessPrompt;
        if (imessage === undefined)
        {
            message = continueMessage + message;
        }
        else
        {
            message = imessage + message;
        }
        context.emit(':ask', message, message);
    },
    cardGuessHelper: function(context, guessType) // Given the user's guess determine if points are awarded or game over (boolean input)
    {
        var message = 'You guessed ';
        if (guessType > 0)
        {
            message += 'higher. ';
        }
        else if (guessType === 0)
        {
            message += 'equal. ';
        }
        else
        {
            message += 'lower. ';
        }
        var currCardValue = helper.getCardValue(context.attributes.cardArray[context.attributes.currentStreak]);
        helper.drawRandomCard(context, context.attributes.currentStreak + 1); // Draws random card for next slot
        var nextCardValue = helper.getCardValue(context.attributes.cardArray[context.attributes.currentStreak + 1]);

        if((nextCardValue > currCardValue && guessType > 0) || (nextCardValue == currCardValue && guessType === 0) 
            || (nextCardValue < currCardValue && guessType < 0)) // Determine if user answered correctly
        {
            var score = 0;  // Correct answer so determine points to be added to score
            var tempCardValue;
            for(var i = context.attributes.currentStreak + 1; i < 52; i++)
            {
                tempCardValue = helper.getCardValue(context.attributes.cardArray[i]);
                if((guessType > 0 && tempCardValue <= currCardValue) || (guessType === 0 && tempCardValue != currCardValue)
                    || (guessType < 0 && tempCardValue >= currCardValue)) // Points are assigned based on how unlikely the decision was
                {
                    score ++;
                }
            }
            score = Math.round(score/(51 - context.attributes.currentStreak) * 100);
            context.attributes.currentScore += score;
            context.attributes.currentStreak++;

            message = message + correctMessage + helper.stringCurrentCard(context) + 'You got ' + score + ' points. ';
            if(context.attributes.currentStreak == 51) // If the user has exhausted all cards
            {
                message = message + congratsMessage + helper.stringScore(context, 'final') + helper.gameOver(context) + playAgainPrompt; 
            }
            else // If there are still cards left
            {
                message = message + helper.stringScore(context, 'current') + guessPrompt;
            }

        }
        else // If the user got it wrong then game over
        {
            message = message + incorrectMessage + helper.stringNextCard(context) + 
                helper.stringScore(context, 'final') + helper.gameOver(context) + playAgainPrompt;
        }
        context.emit(':ask', message, message);
    },

    stringNextCard: function(context)
    {
        return 'The card is the ' + helper.stringCardIdentity(context.attributes.cardArray[context.attributes.currentStreak + 1]) + '. ';
    },

    stringCurrentCard: function(context)
    {
        return 'The card is the ' + helper.stringCardIdentity(context.attributes.cardArray[context.attributes.currentStreak]) + '. ';
    },

    stringScore: function(context, descrip)
    {
        var message = 'Your ' + descrip + ' streak is ' + context.attributes.currentStreak;
        if(context.attributes.currentStreak == 1)
        {
            message += ' card ';
        }
        else
        {
            message += ' cards ';
        }
        return message + 'with a score of ' + context.attributes.currentScore + ' points. ';
    },

    gameOver: function(context)
    {
        var message = helper.testNewHighScore(context);
        context.attributes.currentStreak = undefined;
        context.attributes.currentScore = 0;
        context.handler.state = states.NEWGAMEMODE;
        return message;
    },

    testNewHighScore: function(context)
    {
        var message = '';
        if(context.attributes.currentScore > context.attributes.highScoreScore || 
            (context.attributes.currentScore == context.attributes.highScoreScore && 
            context.attributes.currentStreak < context.attributes.highScoreStreak))
            {
                context.attributes.highScoreScore = context.attributes.currentScore;
                context.attributes.highScoreStreak = context.attributes.currentStreak;

                message += 'You got a new high score. ';
            }
        if(context.attributes.currentStreak > context.attributes.highStreakStreak || 
            (context.attributes.currentStreak == context.attributes.highStreakStreak &&
            context.attributes.currentScore > context.attributes.highStreakScore))
        {
            context.attributes.highStreakStreak = context.attributes.currentStreak;
            context.attributes.highStreakScore = context.attributes.currentScore;

            message += 'You got a new high streak. ';
        }
        return message;
    },

    getCardSuit: function(cardIndex) // Helper function to get card suit (based on number from 0 to 51)
    {
        // Diamonds = 0, Clubs = 1, Hearts = 2, Spades = 3
        switch (cardIndex % 4) {
            case 0:
	            return 'Diamonds';
	        case 1:
	            return 'Clubs';
	        case 2:
	            return 'Hearts';
	        default:
	            return 'Spades';
        }
    },

    getCardValue: function(card) // Helper function to get card value (based on a number from 0 to 51)
    {
         // Jack = 11, Queen = 12, King= 13, Ace = 14
        return Math.ceil((card + 1)/ 4) + 1;
    },

    stringHighScore: function(context)  // Helper function to generate string describing high score
    {
        if(context.attributes.highScoreScore === 0)
        {
            return '';
        }
        var message = 'Your highest score is ' + context.attributes.highScoreScore + ' points with a streak of '
            + context.attributes.highScoreStreak;
        if(context.attributes.highScoreStreak == 1)
        {
            message += ' card. ';
        }
        else
        {
            message += ' cards. ';
        }
        if(context.attributes.highScoreStreak != context.attributes.highStreakStreak)
        {
            message += 'Your highest streak is ' + context.attributes.highStreakStreak;
            if(context.attributes.highScoreStreak == 1)
            {
                message += ' card ';
            }
            else
            {
                message += ' cards ';
            }
            message +=  ' with a score of ' + context.attributes.highStreakScore + 'points. ';
        }
        return message;
    },

    drawRandomCard: function(context, cardIndex) // Helper function to generate next random card value without replacement and assigns it to given index point
    {   
        var numCardsLeft = 52 - cardIndex; // Determine how many cards are left
        var randomIndex = 51 - Math.floor(Math.random() * numCardsLeft); // Generate the index of a random card based on the remaining cards
        
        // swaps card at chosen index with the one at card index
        var tempCard = context.attributes.cardArray[cardIndex];
        context.attributes.cardArray[cardIndex] = context.attributes.cardArray[randomIndex];
        context.attributes.cardArray[randomIndex] = tempCard;
    },

    stringCardIdentity: function(cardIndex)  // Helper function for generating the name of card based on the given card number (0 to 51)
    {
        var suitName = helper.getCardSuit(cardIndex);
  
        var cardValue = helper.getCardValue(cardIndex);
        switch (cardValue) 
        {
            case 14:
	            cardValue = 'Ace';
	            break;
	        case 11:
	            cardValue = 'Jack';
	            break;
	        case 12:
	            cardValue = 'Queen';
	            break;
	        case 13:
	            cardValue = 'King';
	            break;		
        }
        return cardValue + ' of ' + suitName;
    }
};
