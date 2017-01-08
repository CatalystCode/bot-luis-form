# BOT-LUIS-FORM

This repository is a code sample for creating a bot that uses [LUIS](https://www.luis.ai) in order to extract user intent and entities.
For each intent, we define a list of fields we would like to have filled-in by the user in order to be able to process the request. This is **configuration based** and can be found in the [intentForms.json](intentForms.json) file.
The bot will use all of the values LUIS was able to extract, and will prompt the user to provide values for the missing fields.

Main code can be found in [dialogs.js](dialogs.js).

## Using

	git clone https://github.com/CatalystCode/bot-luis-form.git
	cd bot-luis-form
	npm install
	npm start

* In order to use this sample you'll need to onboard with LUIS and create your own LUIS application. The LUIS model that was used for this demo can be imported into your LUIS app. It can be found in the [luis-model](luis-model) folder.
* Edit the file [luis.js](luis.js) and update the `luisEndpoint` variable with the endpoint of your LUIS application.
* Open the bot emulator, connect to the bot, say hi and enter your request when the bot asks how it can help.

A few examples:

* I want to schedule a test drive for Seat Leon for tomorrow
* My name is Ami, and I would like to schedule a test drive

The bot will use LUIS to extract all the information it can: the intent and the different entities. It will prompt you to fill in the fields LUIS couldn't extract because it didn't understand or they were not provided by the user.


# License
[MIT](LICENSE)
