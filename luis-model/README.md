# BOT-LUIS-FORM Model

This file is the export of the sample LUIS application.
It defines two intents `schedule` and `cancel` and a number of entities that can be extracted from the user's text:

* `carType`- the type of the car to test
* `phone`- client phone number
* `service`- which service the user is looking for (ie. _test drive_)
* `name`- the name of the user

You can import this model into LUIS and try to run the sample bot app.
Don't forget to update your LUIS endpoint in the [luis.js](../luis.js) file.

