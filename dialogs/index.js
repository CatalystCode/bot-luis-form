var moment = require('moment');
var _ = require('underscore');
var builder = require('botbuilder');
var extend = require('extend');
var request = require('request');
var path = require('path');
var os = require('os');
var uuid = require('uuid');
var fs = require('fs');

var intentForms = require('./intentForms');

var luis = require('./luis');


var CONFIDENCE_THRESHOLD = 0.99;

function bind(opts) {

	var bot = opts.bot;
	if (!bot) throw new Error('please provide a bot object');

	var intents = new builder.IntentDialog();     
	bot.dialog('/', intents);
/*
	// hi/hello
	intents.matches(/^(hi|hello|הי|אהלן|שלום)/i, [
	 	(session, args, next) => {
			 if (!session.privateConversationData.locale) {
					return session.beginDialog('/localePicker');
			 }
			 return next();
		 },
		 (session, args) => {
			 if (args && args.locale) {
				 session.privateConversationData.locale = args.locale;
			 }

			// hi, how can I help you?
			session.send("welcome-prompt");
			session.beginDialog('/default');
		}
	]);
*/


	intents.onDefault([
		(session) => {
			session.send("Welcome to the automobile bot! This is a sample bot that can be used as a reference for completing missing fields that were not resolved by LUIS.");
			session.beginDialog('/default');
		}
	]);

	bot.dialog('/default', [

		// get status
		session => {
			builder.Prompts.text(session, 'How can I help?');
		},

		// process intent
		(session, args) => {
			var status = args.response;

			//status = "i want to schedule a test drive for tomorrow";
			console.log(`user's status: '${status}'`);
			session.sendTyping();

			return luis.query(status)
				.then(luisResult => {
					return session.beginDialog('/processIntent', { luisResult });
				})
				.catch(err => {
					session.send(`there was an error processing your request, please try again later...`);
					return session.cancelDialog(0, '/');
				});
		},

		// start over again
		session => {
			return session.replaceDialog('/default');
		}
	]);

	bot.dialog('/processIntent', [
		(session, args, next) => {
			const luisResult = args.luisResult;
			const intent = luisResult.topScoringIntent.intent

			console.log(`processing resolved intent: ${intent}`);

			// prepare fields list
			var form = prepareForm(intent);
	
			form.forEach(field => {
				luisResult.entities.forEach(entity => {
					if (entity.type === field.name || entity.type === field.luisType) {
						field.luisEntity = entity;
						/*
						var entityValue = entity.entity;
						
						// TODO convert to specific type...
						if (field.type === "number") {
							entityValue = parseInt(entityValue);
							// TODO check error
						}
						else {
							field.value = entityValue;
						}
						*/
					}
				});
			});

			return session.beginDialog('/collectFormData', { form });
		},

		(session, args, next) => {
			session.userData.form = args.form;
			session.send('processing request..');

			var formString = '';
			Object.keys(args.form).forEach(key => {
				formString += `${key}: ${args.form[key]} \r\n<br/>`;
			});
			session.send(`Form: \r\n<br/>${formString}\r\n<br/>`);

			// TODO: implement request processing... 
			return next();
		},
		(session, args, next) => {
			session.endDialog('bye bye');
		}
	]);

	bot.dialog('/collectFormData', [
		function(session, args, next) {
			const form = args.form;
			if (!form) throw new Error('form array was not provided');
			session.dialogData.form = form;
			
			for (var i=0; i< form.length; i++) {
				var field = form[i];
				session.dialogData.fieldIndex = i;
				

				if (!field.value) {
					if (field.luisEntity) return next();

					console.log(`getting type: ${field.type}`);
					var promptType = builder.Prompts[field.type] ? field.type : 'text';

					var options = field.type === 'choice' ?
							field.options.map(option => option.title).join('|') 
							: null;
					
					return builder.Prompts[promptType](session, field.prompt, options);
				}
			}

			var formDict = {};
			session.dialogData.form.forEach(f => {
				formDict[f.name] = f.value;
			}); 
			return session.endDialogWithResult({ form: formDict });
		},

		function (session, result, next) {
			var field = session.dialogData.form[session.dialogData.fieldIndex];
			switch (field.type) {
				case 'choice':
					if (field.luisEntity) {
						// we already got a value from LUIS, check if this is a valid value
						var val = field.luisEntity.entity.toLowerCase();
						for (var i=0; i<field.options.length; i++) {
							var option = field.options[i];
							if (option.title.toLowerCase() === val || option.value.toLowerCase() == val) {
								field.value = option.value;
								delete field.luisEntity;
								break;
							}
						}
						if (!field.value) {
							// the value provided by LUIS is not a valid option, 
							// ask the user to choose by reducing the index
							session.dialogData.fieldIndex--;
							
						}
						break;
					}
					var selectionIndex = result.response.index;
					field.value = field.options[selectionIndex].value;
					break;
				case 'time':
					field.value = field.luisEntity ? 
						builder.EntityRecognizer.resolveTime([field.luisEntity]) :
						builder.EntityRecognizer.resolveTime([result.response])
					break;
				case 'location':
					var value = {
							latitude: 34.766536,
							longitude: 32.054905
					};
					if (session.message.entities.length)
						value = session.message.entities[0].geo;
					else {
						
						try {
							value = JSON.parse(result.response);
						}
						catch(ex) {
							console.warn('location provided in wrong format, using value as is (probably city name)', result.response);
							value = result.response;
						}
					}
					field.value = value;
					break;
				case 'image':
					field.value = session.message.attachments[0]; // contentType: image/jpeg, contentUrl, thumbnailUrl, name
					break;
				default: // text
					field.value = field.luisEntity ? field.luisEntity.entity : result.response;
					
			}
			delete field.luisEntity;
			session.replaceDialog('/collectFormData', { form: session.dialogData.form });
		}
	]);
}


function prepareForm(intent) {
	const form = [];
	const fields = intentForms.intents[intent];
	if (!fields) return form;
	
	fields.forEach(field => {
		var instance = {};
		extend(instance, intentForms.fields[field], true);
		instance.name = field;
		form.push(instance);
	});

	return form;
}


module.exports = {
	bind
}

